<?php

namespace AHerzog\Hubjutsu\App\Services;

use App\Models\Credential;
use Illuminate\Database\Eloquent\Model;

class CredentialDisplayService
{
    public function maskSecretData(mixed $secretData): mixed
    {
        if (is_array($secretData)) {
            $masked = [];
            foreach ($secretData as $key => $value) {
                $masked[$key] = $this->maskSecretData($value);
            }
            return $masked;
        }

        if (is_string($secretData)) {
            return $this->maskString($secretData);
        }

        if (is_numeric($secretData)) {
            return '***';
        }

        if (is_bool($secretData)) {
            return $secretData;
        }

        return $secretData;
    }

    public function normalizeSecretData(mixed $secretData): array
    {
        if (is_string($secretData)) {
            $decoded = json_decode($secretData, true);
            if (is_array($decoded)) {
                return $decoded;
            }
            return $secretData !== '' ? ['value' => $secretData] : [];
        }

        if (is_array($secretData)) {
            return $secretData;
        }

        return [];
    }

    public function summarizePublicData(Credential $credential): string
    {
        $publicData = $credential->public_data;
        if (!is_array($publicData) || count($publicData) === 0) {
            return '';
        }

        $preferred = [
            'host',
            'hostname',
            'url',
            'base_url',
            'username',
            'client_id',
            'key_id',
            'fingerprint',
            'tenant',
            'audience',
        ];

        foreach ($preferred as $key) {
            $value = $publicData[$key] ?? null;
            if (!is_scalar($value) || $value === '') {
                continue;
            }
            return (string) $value;
        }

        $values = collect($publicData)
            ->filter(fn ($value) => is_scalar($value) && (string) $value !== '')
            ->map(fn ($value, $key) => $key . ': ' . $value)
            ->values()
            ->take(2)
            ->all();

        return implode(' | ', $values);
    }

    public function summarizeCredentialable(Credential $credential): ?string
    {
        $credentialable = $credential->credentialable;
        if (!$credentialable instanceof Model) {
            return null;
        }

        $label = null;
        foreach (['label', 'name', 'title', 'email'] as $field) {
            $value = $credentialable->getAttribute($field);
            if (is_scalar($value) && (string) $value !== '') {
                $label = (string) $value;
                break;
            }
        }

        $type = class_basename($credentialable);
        $id = $credentialable->getKey();

        if ($label) {
            return sprintf('%s #%s (%s)', $type, $id, $label);
        }

        return sprintf('%s #%s', $type, $id);
    }

    protected function maskString(string $value): string
    {
        if ($value === '') {
            return '';
        }

        $length = mb_strlen($value);
        if ($length <= 4) {
            return str_repeat('*', $length);
        }

        if ($length <= 14) {
            return mb_substr($value, 0, 2) . '...' . mb_substr($value, -2);
        }

        return mb_substr($value, 0, 4) . '...' . mb_substr($value, -4);
    }
}
