# Database Schema for [Your App Name]

## Table Names

| table_name |
| ---------- |
| users      |
| events     |
| userevents |

## Column Information for Each Table

### Users Table

| column_name     | data_type |
| --------------- | --------- |
| id              | uuid      |
| first_name      | text      |
| last_name       | text      |
| email           | text      |
| phone           | text      |
| date_of_birth   | date      |
| clerk_id        | text      |
| events_attended | integer   |
| total_spent     | numeric   |

### Events Table

| column_name | data_type                |
| ----------- | ------------------------ |
| id          | uuid                     |
| event_name  | text                     |
| location    | text                     |
| event_date  | timestamp with time zone |
| image_url   | text                     |

### UserEvents Table

| column_name   | data_type                |
| ------------- | ------------------------ |
| id            | uuid                     |
| user_id       | uuid                     |
| event_id      | uuid                     |
| purchase_date | timestamp with time zone |
| ticket_price  | numeric                  |
| qr_code       | text                     |
| status        | text                     |

## Foreign Keys

| foreign_table | foreign_column | primary_table | primary_column |
| ------------- | -------------- | ------------- | -------------- |
| userevents    | event_id       | events        | id             |
| userevents    | user_id        | users         | id             |

## Primary Keys

| table_name | constraint_name | column_name |
| ---------- | --------------- | ----------- |
| users      | users_pkey      | id          |
| events     | events_pkey     | id          |
| userevents | userevents_pkey | id          |

## Relationships

- **Users -> UserEvents**: One-to-Many (One user can have multiple user events)
- **Events -> UserEvents**: One-to-Many (One event can have multiple user events)

## Example Records

### Users Table

| id                                   | first_name | last_name | email             | phone        | date_of_birth | clerk_id | events_attended | total_spent |
| ------------------------------------ | ---------- | --------- | ----------------- | ------------ | ------------- | -------- | --------------- | ----------- |
| 123e4567-e89b-12d3-a456-426614174000 | John       | Doe       | john.doe@mail.com | 123-456-7890 | 1990-01-01    | clerk123 | 5               | 150.50      |

### Events Table

| id                                   | event_name    | location | event_date             | image_url                     |
| ------------------------------------ | ------------- | -------- | ---------------------- | ----------------------------- |
| 123e4567-e89b-12d3-a456-426614174001 | Concert Night | New York | 2024-07-24 19:00:00+00 | https://example.com/image.png |

### UserEvents Table

| id                                   | user_id                              | event_id                             | purchase_date          | ticket_price | qr_code | status |
| ------------------------------------ | ------------------------------------ | ------------------------------------ | ---------------------- | ------------ | ------- | ------ |
| 123e4567-e89b-12d3-a456-426614174002 | 123e4567-e89b-12d3-a456-426614174000 | 123e4567-e89b-12d3-a456-426614174001 | 2024-07-20 12:34:56+00 | 30.00        | QR123   | booked |

## Notes

- **Users Table**: Stores user information.
- **Events Table**: Stores event details.
- **UserEvents Table**: Links users to events and stores purchase details.
