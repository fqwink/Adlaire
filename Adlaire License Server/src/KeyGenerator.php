<?php
declare(strict_types=1);

/**
 * API key generation for Adlaire License Server.
 * Spec: LICENSE_SERVER_RULEBOOK.md §5
 */
final class KeyGenerator
{
    private const KEY_BYTES = 24; // 24 bytes = 48 hex chars

    public static function primaryKey(): string
    {
        return 'ASCMS-PRI-' . bin2hex(random_bytes(self::KEY_BYTES));
    }

    public static function secondKey(): string
    {
        return 'ASCMS-SEC-' . bin2hex(random_bytes(self::KEY_BYTES));
    }

    public static function thirdPartyKey(): string
    {
        return 'ASCMS-TPK-' . bin2hex(random_bytes(self::KEY_BYTES));
    }
}
