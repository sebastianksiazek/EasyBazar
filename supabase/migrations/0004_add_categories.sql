insert into public.categories (name, slug) values
  ('Elektronika',      'elektronika'),
  ('Dom i ogród',      'dom-ogrod'),
  ('Moda',             'moda'),
  ('Oddam za darmo',   'oddam-za-darmo'),
  ('Motoryzacja',      'motoryzacja'),
  ('Nieruchomości',    'nieruchomosci'),
  ('Praca',            'praca')
on conflict (slug) do nothing;