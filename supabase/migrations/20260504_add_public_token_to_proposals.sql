alter table proposals
add column if not exists public_token text;

create unique index if not exists proposals_public_token_key
on proposals(public_token);

update proposals
set public_token = gen_random_uuid()::text
where public_token is null;

alter table proposals
alter column public_token set not null;