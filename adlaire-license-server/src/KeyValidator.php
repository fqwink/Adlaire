<?php
declare(strict_types=1);

/**
 * Request validation for Adlaire License Server.
 * Spec: LICENSE_SERVER_RULEBOOK.md §3.5
 */
final class KeyValidator
{
    private const SYSTEM_KEY_PATTERN = '/^[a-f0-9]{64}$/';
    private const PRIMARY_KEY_PATTERN = '/^ASCMS-PRI-[a-f0-9]{48}$/';
    private const TIMESTAMP_MAX_DRIFT = 300; // ±5 minutes

    public static function validateSystemKey(string $key): bool
    {
        return preg_match(self::SYSTEM_KEY_PATTERN, $key) === 1;
    }

    public static function validatePrimaryKey(string $key): bool
    {
        return preg_match(self::PRIMARY_KEY_PATTERN, $key) === 1;
    }

    public static function validateTimestamp(string $timestamp): bool
    {
        $ts = strtotime($timestamp);
        if ($ts === false) {
            return false;
        }
        return abs(time() - $ts) <= self::TIMESTAMP_MAX_DRIFT;
    }

    /**
     * Parse and validate JSON request body.
     * @return array<string, mixed>|null
     */
    public static function parseRequestBody(): ?array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') {
            return null;
        }
        $data = json_decode($raw, true);
        return is_array($data) ? $data : null;
    }
}
