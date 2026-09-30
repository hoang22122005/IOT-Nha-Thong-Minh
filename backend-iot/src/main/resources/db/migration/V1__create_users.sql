create table users (
    id bigint generated always as identity primary key,
    email text not null,
    display_name text not null,
    password_hash text not null,
    role text not null default 'USER' check (role in ('USER', 'ADMIN')),
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index users_email_lower_unique on users (lower(email));
