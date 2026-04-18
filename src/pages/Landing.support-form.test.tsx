import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { SupportForm } from "./Landing";

const mockInvoke = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: mockInvoke },
    auth: { getSession: mockGetSession },
    from: vi.fn(() => ({ insert: vi.fn() })),
  },
}));

vi.mock("@/components/TurnstileCaptcha", () => ({
  default: ({ onVerify }: { onVerify: (token: string) => void }) => (
    <button type="button" onClick={() => onVerify("token")}>
      verify-captcha
    </button>
  ),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("SupportForm validation", () => {
  it("blocks submission for invalid email and shows inline error", async () => {
    mockInvoke.mockResolvedValue({ data: { valid: true }, error: null });
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { container } = render(<SupportForm />);

    fireEvent.change(screen.getByPlaceholderText("support.name_placeholder"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByPlaceholderText("support.email_placeholder"), {
      target: { value: "invalid-email" },
    });
    fireEvent.change(screen.getByPlaceholderText("support.message_placeholder"), {
      target: { value: "Hello world" },
    });
    fireEvent.click(screen.getByRole("button", { name: "verify-captcha" }));

    await waitFor(() => expect(screen.getByText("support.email_invalid")).toBeInTheDocument());
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("submits with valid normalized email", async () => {
    mockInvoke.mockResolvedValue({ data: { valid: true }, error: null });
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { container } = render(<SupportForm />);

    fireEvent.change(screen.getByPlaceholderText("support.name_placeholder"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByPlaceholderText("support.email_placeholder"), {
      target: { value: "  USER@Example.com " },
    });
    fireEvent.change(screen.getByPlaceholderText("support.message_placeholder"), {
      target: { value: "Hello world" },
    });
    fireEvent.click(screen.getByRole("button", { name: "verify-captcha" }));
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    await waitFor(() => expect(mockInvoke).toHaveBeenCalledTimes(1));
    expect(mockInvoke.mock.calls[0][1].body.email).toBe("user@example.com");
  });
});
