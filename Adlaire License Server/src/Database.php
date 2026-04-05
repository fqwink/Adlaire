<?php
declare(strict_types=1);

/**
 * SQLite database wrapper for Adlaire License Server.
 */
final class Database
{
    private static ?self $instance = null;
    private \PDO $pdo;

    private function __construct(string $dbPath)
    {
        $dir = dirname($dbPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $this->pdo = new \PDO('sqlite:' . $dbPath, null, null, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
            \PDO::ATTR_EMULATE_PREPARES => false,
        ]);

        $this->pdo->exec('PRAGMA journal_mode=WAL');
        $this->pdo->exec('PRAGMA foreign_keys=ON');

        $this->migrate();
    }

    public static function getInstance(string $dbPath): self
    {
        if (self::$instance === null) {
            self::$instance = new self($dbPath);
        }
        return self::$instance;
    }

    public function pdo(): \PDO
    {
        return $this->pdo;
    }

    private function migrate(): void
    {
        $this->pdo->exec('
            CREATE TABLE IF NOT EXISTS licenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                system_key TEXT UNIQUE NOT NULL,
                primary_key TEXT UNIQUE NOT NULL,
                second_key TEXT UNIQUE NOT NULL,
                domain TEXT NOT NULL DEFAULT \'\',
                product_version TEXT NOT NULL DEFAULT \'\',
                status TEXT NOT NULL DEFAULT \'active\',
                registered_at TEXT NOT NULL,
                last_verified_at TEXT,
                ip_address TEXT NOT NULL DEFAULT \'\'
            )
        ');

        $this->pdo->exec('
            CREATE TABLE IF NOT EXISTS contracts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                license_id INTEGER NOT NULL,
                third_party_key TEXT UNIQUE NOT NULL,
                contract_code TEXT UNIQUE NOT NULL,
                contract_type TEXT NOT NULL DEFAULT \'commercial\',
                contractor_name TEXT NOT NULL DEFAULT \'\',
                contractor_email TEXT NOT NULL DEFAULT \'\',
                status TEXT NOT NULL DEFAULT \'active\',
                issued_at TEXT NOT NULL,
                expires_at TEXT,
                FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE
            )
        ');

        $this->pdo->exec('
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT NOT NULL,
                system_key TEXT,
                ip_address TEXT,
                details TEXT,
                created_at TEXT NOT NULL
            )
        ');
    }
}
