-- Replace removed Unsplash jet-boat photo in seeded demo data

UPDATE boats
SET image_urls = (
  SELECT COALESCE(array_agg(
    CASE
      WHEN url LIKE '%photo-1605281317010-fe6ffe85f283%'
      THEN 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'
      ELSE url
    END
  ), '{}')
  FROM unnest(image_urls) AS url
)
WHERE EXISTS (
  SELECT 1 FROM unnest(image_urls) AS url
  WHERE url LIKE '%photo-1605281317010-fe6ffe85f283%'
);
