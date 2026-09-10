-- Flavor requests contain customer contact details and are only accessed through server routes.

ALTER TABLE public.flavor_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.flavor_requests FROM anon, authenticated;
GRANT ALL ON TABLE public.flavor_requests TO service_role;

COMMENT ON TABLE public.flavor_requests
IS 'Private customer flavor requests. Browser roles have no direct access; server routes use service_role.';
