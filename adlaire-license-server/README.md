# Adlaire License Server

APIキー認証・認可管理システム for Adlaire Static CMS.

## Requirements

- PHP 8.3+
- SQLite 3
- Apache with mod_rewrite

## Setup

1. Set the document root to `public/`
2. Create admin credentials:

```bash
php -r "echo json_encode(['username'=>'admin','password'=>password_hash('YOUR_PASSWORD',PASSWORD_DEFAULT)],JSON_PRETTY_PRINT);" > data/admin.json
chmod 600 data/admin.json
```

3. Ensure `data/` directory is writable by the web server
4. Access `admin.php` to verify

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/license/register` | Register system key, receive primary + second keys |
| POST | `/api/license/verify` | Verify key validity |
| POST | `/api/license/renew` | Renew license keys |
| POST | `/api/license/third-party` | Validate/retrieve third-party key |

## Spec

See `LICENSE_SERVER_RULEBOOK.md` in the Adlaire main repository.
