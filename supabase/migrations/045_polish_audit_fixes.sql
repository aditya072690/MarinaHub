-- QA audit: expose boat_rating_stats view to API roles
GRANT SELECT ON boat_rating_stats TO anon, authenticated;
