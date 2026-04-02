import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../shared/cors.ts";
import { requireCsrfToken } from "../shared/csrf.ts";

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // VULN-10: CSRF protection on this destructive admin operation
    const csrfError = requireCsrfToken(req, cors);
    if (csrfError) return csrfError;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify calling user is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: callingUser },
    } = await userClient.auth.getUser();
    if (!callingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { target_user_id } = await req.json();
    if (!target_user_id || typeof target_user_id !== "string") {
      return new Response(
        JSON.stringify({ error: "target_user_id is required" }),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Prevent self-deletion
    if (target_user_id === callingUser.id) {
      return new Response(
        JSON.stringify({ error: "Cannot delete your own account" }),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Delete from profiles and user_roles (cascade will handle)
    await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", target_user_id);
    await adminClient
      .from("profiles")
      .delete()
      .eq("user_id", target_user_id);

    // Delete user from auth
    const { error: deleteError } =
      await adminClient.auth.admin.deleteUser(target_user_id);

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Record audit trail for the deletion
    try {
      await adminClient.from("audit_logs").insert({
        user_id: callingUser.id,
        action: "admin_delete_user",
        entity_type: "user",
        entity_id: target_user_id,
        old_values: { user_id: target_user_id },
        new_values: { deleted: true },
        status: "success",
      });
    } catch (auditError) {
      console.error(
        `Failed to write audit log for user deletion ${target_user_id}:`,
        auditError
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
