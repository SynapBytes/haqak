-- Create a public stats function that returns anonymous aggregated data
CREATE OR REPLACE FUNCTION public.get_public_issue_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total', (SELECT count(*) FROM issues),
    'resolved', (SELECT count(*) FROM issues WHERE status = 'resolved'),
    'in_progress', (SELECT count(*) FROM issues WHERE status = 'in-progress'),
    'received', (SELECT count(*) FROM issues WHERE status = 'received'),
    'by_category', (
      SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)
      FROM (SELECT category as name, count(*)::int as value FROM issues GROUP BY category ORDER BY count(*) DESC) t
    ),
    'by_location', (
      SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)
      FROM (SELECT split_part(location, ',', 1) as name, count(*)::int as value FROM issues GROUP BY 1 ORDER BY count(*) DESC LIMIT 10) t
    )
  )
$$;