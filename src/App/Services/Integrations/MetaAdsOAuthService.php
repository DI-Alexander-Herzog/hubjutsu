<?php

namespace AHerzog\Hubjutsu\App\Services\Integrations;

use App\Models\Credential;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class MetaAdsOAuthService extends BaseMetaOAuthService
{
    public const SERVICE_KEY = 'meta_ads';

    protected const GRAPH_BASE_URL = 'https://graph.facebook.com/v22.0';

    public function provider(): string
    {
        return self::SERVICE_KEY;
    }

    public function label(): string
    {
        return 'Meta Ads';
    }

    public function description(): string
    {
        return 'Meta Ads OAuth (eigene App-ID/Secret für Ads und Ad Accounts).';
    }

    public function setupDocsUrl(): ?string
    {
        return 'https://developers.facebook.com/apps/creation/';
    }

    public function setupInstructions(): array
    {
        return [
            'Gehe zu <a href="https://developers.facebook.com/apps/creation/" target="_blank" rel="noreferrer">https://developers.facebook.com/apps/creation/</a> und erstelle eine neue App.',
            'Wähle als Anwendungsfälle: "Werbung und Monetarisierung" (alle 6 Punkte), Alle (nur Alles auf deiner Seite verwalten)',
            'Verknüpfe die App mit dem passenden Portfolio/Business.',
            'Als Entwickler-App sind oft keine weiteren Freigaben nötig.',
            'Links im Menu bei der App: "Facebook Login for Business" öffnen und die Callback-URL als "gültige OAuth Redirect URI" (das ist in der Mitte der Page) eintragen.',
            'Links im Menu bei der App: App-Einstellungen > Allgemein die App-ID und den App-Geheimcode kopieren und im Connect-Form eintragen.',
        ];
    }

    protected function defaultScopes(): array
    {
        return [
            'ads_management',
            'ads_read',
            'business_management',
            'catalog_management',
            'pages_show_list',
            'pages_read_engagement',
            'leads_retrieval',
        ];
    }

    /**
     * Ad-Accounts als einfache Liste (ohne Paging-Objekt).
     *
     * @return array<int, array<string, mixed>>
     */
    public function listAdAccounts(
        array $fields = ['id', 'name', 'account_id', 'account_status', 'currency', 'business'],
        int $limit = 100
    ): array {
        $result = $this->listAdAccountsPage($fields, $limit);
        return $result['data'];
    }

    /**
     * Ad-Accounts inkl. Paging-Info.
     *
     * @return array{data: array<int, array<string, mixed>>, paging: array<string, mixed>}
     */
    public function listAdAccountsPage(
        array $fields = ['id', 'name', 'account_id', 'account_status', 'currency', 'business'],
        int $limit = 100,
        ?string $after = null
    ): array {
        $credential = $this->resolveCredential();

        return $this->graphGetCollection(
            $credential,
            'me/adaccounts',
            $fields,
            $limit,
            $after
        );
    }

    /**
     * Alle Campaigns; optional nur für ein Ad-Account.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listAllCampaigns(
        ?string $adAccountId = null,
        array $fields = ['id', 'name', 'status', 'effective_status', 'objective', 'created_time', 'updated_time'],
        int $pageLimit = 100,
        int $maxPages = 25
    ): array {
        if ($adAccountId !== null && trim($adAccountId) !== '') {
            return $this->listAllObjectsForAccount($adAccountId, 'campaigns', $fields, $pageLimit, $maxPages);
        }

        return $this->listAllObjectsAcrossAccounts('campaigns', $fields, $pageLimit, 10, $maxPages);
    }

    /**
     * Alle AdGroups (= AdSets); optional nur für ein Ad-Account.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listAllAdGroups(
        ?string $adAccountId = null,
        array $fields = ['id', 'name', 'status', 'effective_status', 'campaign_id', 'daily_budget', 'lifetime_budget', 'created_time', 'updated_time'],
        int $pageLimit = 100,
        int $maxPages = 25
    ): array {
        if ($adAccountId !== null && trim($adAccountId) !== '') {
            return $this->listAllObjectsForAccount($adAccountId, 'adsets', $fields, $pageLimit, $maxPages);
        }

        return $this->listAllObjectsAcrossAccounts('adsets', $fields, $pageLimit, 10, $maxPages);
    }

    /**
     * Alle Ads; optional nur für ein Ad-Account.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listAllAds(
        ?string $adAccountId = null,
        array $fields = ['id', 'name', 'status', 'effective_status', 'adset_id', 'campaign_id', 'created_time', 'updated_time'],
        int $pageLimit = 100,
        int $maxPages = 25
    ): array {
        if ($adAccountId !== null && trim($adAccountId) !== '') {
            return $this->listAllObjectsForAccount($adAccountId, 'ads', $fields, $pageLimit, $maxPages);
        }

        return $this->listAllObjectsAcrossAccounts('ads', $fields, $pageLimit, 10, $maxPages);
    }

    /**
     * Daily Campaign-Insights mit Kennzahlen im gewünschten Zeitraum.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listCampaignPerformance(
        string $dateFrom,
        string $dateTo,
        ?string $adAccountId = null,
        array $eventConfig = [],
        bool $onlyActiveInRange = true,
        int $pageLimit = 100,
        int $maxPagesPerAccount = 25
    ): array {
        return $this->listPerformanceByLevel(
            'campaign',
            $dateFrom,
            $dateTo,
            $adAccountId,
            $eventConfig,
            $onlyActiveInRange,
            $pageLimit,
            $maxPagesPerAccount
        );
    }

    /**
     * Daily AdGroup(AdSet)-Insights mit Kennzahlen im gewünschten Zeitraum.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listAdGroupPerformance(
        string $dateFrom,
        string $dateTo,
        ?string $adAccountId = null,
        array $eventConfig = [],
        bool $onlyActiveInRange = true,
        int $pageLimit = 100,
        int $maxPagesPerAccount = 25
    ): array {
        return $this->listPerformanceByLevel(
            'adset',
            $dateFrom,
            $dateTo,
            $adAccountId,
            $eventConfig,
            $onlyActiveInRange,
            $pageLimit,
            $maxPagesPerAccount
        );
    }

    /**
     * Daily Ad-Insights mit Kennzahlen im gewünschten Zeitraum.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listAdPerformance(
        string $dateFrom,
        string $dateTo,
        ?string $adAccountId = null,
        array $eventConfig = [],
        bool $onlyActiveInRange = true,
        int $pageLimit = 100,
        int $maxPagesPerAccount = 25
    ): array {
        return $this->listPerformanceByLevel(
            'ad',
            $dateFrom,
            $dateTo,
            $adAccountId,
            $eventConfig,
            $onlyActiveInRange,
            $pageLimit,
            $maxPagesPerAccount
        );
    }

    /**
     * Aktive Ads-Struktur (AdAccount -> Campaign -> AdGroup -> Ad) im Zeitraum.
     *
     * @return array{
     *   date_from: string,
     *   date_to: string,
     *   totals: array<string, mixed>,
     *   accounts: array<int, array<string, mixed>>
     * }
     */
    public function listActiveDrilldown(
        string $dateFrom,
        string $dateTo,
        ?string $adAccountId = null,
        array $eventConfig = [],
        int $pageLimit = 100,
        int $maxPagesPerAccount = 25
    ): array {
        $rows = $this->listAdPerformance(
            $dateFrom,
            $dateTo,
            $adAccountId,
            $eventConfig,
            true,
            $pageLimit,
            $maxPagesPerAccount
        );

        return $this->buildActiveDrilldown($rows, $dateFrom, $dateTo);
    }

    /**
     * Flache Campaign-Importliste mit KPI-Summen pro Campaign.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listCampaignImportOptions(
        string $dateFrom,
        string $dateTo,
        ?string $adAccountId = null,
        array $eventConfig = [],
        int $pageLimit = 100,
        int $maxPagesPerAccount = 25
    ): array {
        $drilldown = $this->listActiveDrilldown(
            $dateFrom,
            $dateTo,
            $adAccountId,
            $eventConfig,
            $pageLimit,
            $maxPagesPerAccount
        );

        $campaigns = [];
        foreach ($drilldown['accounts'] as $account) {
            foreach (($account['campaigns'] ?? []) as $campaign) {
                $campaigns[] = [
                    'account_id' => $account['id'] ?? null,
                    'account_name' => $account['name'] ?? null,
                    'account_number' => $account['account_number'] ?? null,
                    'campaign_id' => $campaign['id'] ?? null,
                    'campaign_name' => $campaign['name'] ?? null,
                    'metrics' => $campaign['metrics'] ?? [],
                ];
            }
        }

        return $campaigns;
    }

    /**
     * Aktive Campaigns im Zeitraum als flache Liste.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listActiveCampaignsInRange(
        string $dateFrom,
        string $dateTo,
        ?string $adAccountId = null,
        array $eventConfig = [],
        int $pageLimit = 100,
        int $maxPagesPerAccount = 25
    ): array {
        return $this->listCampaignImportOptions(
            $dateFrom,
            $dateTo,
            $adAccountId,
            $eventConfig,
            $pageLimit,
            $maxPagesPerAccount
        );
    }

    /**
     * Aktive AdGroups im Zeitraum als flache Liste.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listActiveAdGroupsInRange(
        string $dateFrom,
        string $dateTo,
        ?string $adAccountId = null,
        array $eventConfig = [],
        int $pageLimit = 100,
        int $maxPagesPerAccount = 25
    ): array {
        $drilldown = $this->listActiveDrilldown(
            $dateFrom,
            $dateTo,
            $adAccountId,
            $eventConfig,
            $pageLimit,
            $maxPagesPerAccount
        );

        $adGroups = [];
        foreach ($drilldown['accounts'] as $account) {
            foreach (($account['campaigns'] ?? []) as $campaign) {
                foreach (($campaign['adgroups'] ?? []) as $adGroup) {
                    $adGroups[] = [
                        'account_id' => $account['id'] ?? null,
                        'account_name' => $account['name'] ?? null,
                        'campaign_id' => $campaign['id'] ?? null,
                        'campaign_name' => $campaign['name'] ?? null,
                        'adgroup_id' => $adGroup['id'] ?? null,
                        'adgroup_name' => $adGroup['name'] ?? null,
                        'metrics' => $adGroup['metrics'] ?? [],
                    ];
                }
            }
        }

        return $adGroups;
    }

    /**
     * Aktive Ads im Zeitraum als flache Liste.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listActiveAdsInRange(
        string $dateFrom,
        string $dateTo,
        ?string $adAccountId = null,
        array $eventConfig = [],
        int $pageLimit = 100,
        int $maxPagesPerAccount = 25
    ): array {
        $drilldown = $this->listActiveDrilldown(
            $dateFrom,
            $dateTo,
            $adAccountId,
            $eventConfig,
            $pageLimit,
            $maxPagesPerAccount
        );

        $ads = [];
        foreach ($drilldown['accounts'] as $account) {
            foreach (($account['campaigns'] ?? []) as $campaign) {
                foreach (($campaign['adgroups'] ?? []) as $adGroup) {
                    foreach (($adGroup['ads'] ?? []) as $ad) {
                        $ads[] = [
                            'account_id' => $account['id'] ?? null,
                            'account_name' => $account['name'] ?? null,
                            'campaign_id' => $campaign['id'] ?? null,
                            'campaign_name' => $campaign['name'] ?? null,
                            'adgroup_id' => $adGroup['id'] ?? null,
                            'adgroup_name' => $adGroup['name'] ?? null,
                            'ad_id' => $ad['id'] ?? null,
                            'ad_name' => $ad['name'] ?? null,
                            'metrics' => $ad['metrics'] ?? [],
                        ];
                    }
                }
            }
        }

        return $ads;
    }

    /**
     * KPI-Timeline pro Tag (aggregiert über alle aktiven Ads im Zeitraum).
     *
     * @return array<int, array<string, mixed>>
     */
    public function listDailyKpiTimeline(
        string $dateFrom,
        string $dateTo,
        ?string $adAccountId = null,
        array $eventConfig = [],
        int $pageLimit = 100,
        int $maxPagesPerAccount = 25
    ): array {
        $rows = $this->listAdPerformance(
            $dateFrom,
            $dateTo,
            $adAccountId,
            $eventConfig,
            true,
            $pageLimit,
            $maxPagesPerAccount
        );

        $daily = [];
        foreach ($rows as $row) {
            $day = (string) ($row['date'] ?? '');
            if ($day === '') {
                continue;
            }

            if (!isset($daily[$day])) {
                $daily[$day] = [
                    'date' => $day,
                    '_acc' => $this->newMetricAccumulator(),
                ];
            }
            $this->addRowToAccumulator($daily[$day]['_acc'], $row);
        }

        ksort($daily);

        $result = [];
        foreach ($daily as $day => $payload) {
            $result[] = [
                'date' => $day,
                'metrics' => $this->finalizeAccumulator($payload['_acc']),
            ];
        }

        return $result;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listAllAdAccounts(
        array $fields = ['id', 'name', 'account_id', 'account_status', 'currency', 'business'],
        int $pageLimit = 100,
        int $maxPages = 10
    ): array {
        $after = null;
        $page = 0;
        $all = [];

        do {
            $result = $this->listAdAccountsPage($fields, $pageLimit, $after);
            $all = array_merge($all, $result['data']);
            $after = data_get($result, 'paging.cursors.after');
            $page++;
        } while ($after && $page < $maxPages);

        return $all;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function listAllObjectsForAccount(
        string $adAccountId,
        string $edge,
        array $fields,
        int $pageLimit,
        int $maxPages
    ): array {
        $credential = $this->resolveCredential();
        $after = null;
        $page = 0;
        $all = [];
        $path = $this->normalizeAdAccountPath($adAccountId) . '/' . trim($edge, '/');

        do {
            $result = $this->graphGetCollection($credential, $path, $fields, $pageLimit, $after);
            $all = array_merge($all, $result['data']);
            $after = data_get($result, 'paging.cursors.after');
            $page++;
        } while ($after && $page < $maxPages);

        return $all;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function listAllObjectsAcrossAccounts(
        string $edge,
        array $fields,
        int $pageLimit,
        int $maxAccountPages,
        int $maxObjectPagesPerAccount
    ): array {
        $accounts = $this->listAllAdAccounts(['id', 'name', 'account_id'], 100, $maxAccountPages);
        $all = [];

        foreach ($accounts as $account) {
            $accountId = isset($account['id']) ? (string) $account['id'] : '';
            if ($accountId === '') {
                continue;
            }

            $rows = $this->listAllObjectsForAccount(
                $accountId,
                $edge,
                $fields,
                $pageLimit,
                $maxObjectPagesPerAccount
            );

            foreach ($rows as $row) {
                if (is_array($row)) {
                    $row['_account_id'] = $account['id'] ?? null;
                    $row['_account_name'] = $account['name'] ?? null;
                    $row['_account_number'] = $account['account_id'] ?? null;
                }
                $all[] = $row;
            }
        }

        return $all;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function listPerformanceByLevel(
        string $level,
        string $dateFrom,
        string $dateTo,
        ?string $adAccountId,
        array $eventConfig,
        bool $onlyActiveInRange,
        int $pageLimit,
        int $maxPagesPerAccount
    ): array {
        $credential = $this->resolveCredential();
        $dateFrom = $this->normalizeDate($dateFrom);
        $dateTo = $this->normalizeDate($dateTo);

        $accounts = [];
        if ($adAccountId !== null && trim($adAccountId) !== '') {
            $accounts[] = ['id' => $this->normalizeAdAccountPath($adAccountId)];
        } else {
            $accounts = $this->listAllAdAccounts(['id', 'name', 'account_id'], 100, 10);
        }

        $rows = [];
        foreach ($accounts as $account) {
            $accountId = isset($account['id']) ? (string) $account['id'] : '';
            if ($accountId === '') {
                continue;
            }

            $after = null;
            $page = 0;
            do {
                $result = $this->graphGetInsights(
                    $credential,
                    $accountId,
                    $level,
                    $dateFrom,
                    $dateTo,
                    $pageLimit,
                    $after
                );

                foreach ($result['data'] as $rawRow) {
                    $row = $this->normalizeInsightRow($rawRow, $eventConfig);
                    if ($onlyActiveInRange && !$this->isActiveInsightRow($row)) {
                        continue;
                    }
                    $rows[] = $row;
                }

                $after = data_get($result, 'paging.cursors.after');
                $page++;
            } while ($after && $page < $maxPagesPerAccount);
        }

        return $rows;
    }

    /**
     * @return array{data: array<int, array<string, mixed>>, paging: array<string, mixed>}
     */
    protected function graphGetInsights(
        Credential $credential,
        string $adAccountId,
        string $level,
        string $dateFrom,
        string $dateTo,
        int $limit,
        ?string $after = null
    ): array {
        $accountPath = $this->normalizeAdAccountPath($adAccountId) . '/insights';
        $fields = [
            'date_start',
            'date_stop',
            'account_id',
            'account_name',
            'campaign_id',
            'campaign_name',
            'adset_id',
            'adset_name',
            'ad_id',
            'ad_name',
            'spend',
            'impressions',
            'reach',
            'clicks',
            'ctr',
            'cpc',
            'inline_link_clicks',
            'actions',
            'cost_per_action_type',
        ];

        $params = [
            'level' => $level,
            'time_increment' => 1,
            'time_range' => json_encode([
                'since' => $dateFrom,
                'until' => $dateTo,
            ], JSON_THROW_ON_ERROR),
            'fields' => implode(',', $fields),
            'limit' => max(1, min(500, $limit)),
        ];

        return $this->graphGetCollection($credential, $accountPath, [], $params['limit'], $after, $params);
    }

    /**
     * @param array<string, mixed> $rawRow
     * @param array<string, mixed> $eventConfig
     * @return array<string, mixed>
     */
    protected function normalizeInsightRow(array $rawRow, array $eventConfig = []): array
    {
        $spend = $this->toFloat($rawRow['spend'] ?? 0);
        $impressions = $this->toInt($rawRow['impressions'] ?? 0);
        $ctrAll = $this->toFloat($rawRow['ctr'] ?? 0);
        $inlineLinkClicks = $this->toInt($rawRow['inline_link_clicks'] ?? 0);
        $landingPageViews = $this->sumActions($rawRow, $eventConfig['landing_page_views'] ?? ['landing_page_view']);
        $formViews = $this->sumActions($rawRow, $eventConfig['form_views'] ?? ['leadgen.other', 'onsite_conversion.lead_grouped']);
        $leads = $this->sumActions($rawRow, $eventConfig['leads'] ?? ['lead', 'offsite_conversion.fb_pixel_lead']);

        $row = [
            'date' => (string) ($rawRow['date_start'] ?? ''),
            'date_start' => (string) ($rawRow['date_start'] ?? ''),
            'date_stop' => (string) ($rawRow['date_stop'] ?? ''),
            'account_id' => $rawRow['account_id'] ?? null,
            'account_name' => $rawRow['account_name'] ?? null,
            'campaign_id' => $rawRow['campaign_id'] ?? null,
            'campaign_name' => $rawRow['campaign_name'] ?? null,
            'adgroup_id' => $rawRow['adset_id'] ?? null,
            'adgroup_name' => $rawRow['adset_name'] ?? null,
            'ad_id' => $rawRow['ad_id'] ?? null,
            'ad_name' => $rawRow['ad_name'] ?? null,
            'spend' => $spend,
            'impressions' => $impressions,
            'reach' => $this->toInt($rawRow['reach'] ?? 0),
            'ctr_all_percent' => $ctrAll,
            'clicks' => $this->toInt($rawRow['clicks'] ?? 0),
            'link_clicks' => $inlineLinkClicks,
            'cost_per_link_click' => $inlineLinkClicks > 0 ? $spend / $inlineLinkClicks : null,
            'link_ctr_percent' => $impressions > 0 ? ($inlineLinkClicks / $impressions) * 100 : 0.0,
            'landing_page_views' => $landingPageViews,
            'cost_per_landing_page_view' => $landingPageViews > 0 ? $spend / $landingPageViews : null,
            'landing_page_view_percent' => $impressions > 0 ? ($landingPageViews / $impressions) * 100 : 0.0,
            'form_views' => $formViews,
            'cost_per_form_view' => $formViews > 0 ? $spend / $formViews : null,
            'form_view_percent' => $impressions > 0 ? ($formViews / $impressions) * 100 : 0.0,
            'leads' => $leads,
            'cost_per_lead' => $leads > 0 ? $spend / $leads : null,
            'lead_percent' => $impressions > 0 ? ($leads / $impressions) * 100 : 0.0,
            'raw_actions' => $rawRow['actions'] ?? [],
            'raw_cost_per_action_type' => $rawRow['cost_per_action_type'] ?? [],
        ];

        if (isset($eventConfig['custom']) && is_array($eventConfig['custom'])) {
            $row['custom_events'] = [];
            foreach ($eventConfig['custom'] as $label => $actionTypes) {
                $count = $this->sumActions($rawRow, is_array($actionTypes) ? $actionTypes : [(string) $actionTypes]);
                $row['custom_events'][$label] = [
                    'count' => $count,
                    'cost' => $count > 0 ? $spend / $count : null,
                    'percent' => $impressions > 0 ? ($count / $impressions) * 100 : 0.0,
                ];
            }
        }

        return $row;
    }

    /**
     * @param array<string, mixed> $row
     */
    protected function isActiveInsightRow(array $row): bool
    {
        return $this->toFloat($row['spend'] ?? 0) > 0
            || $this->toInt($row['impressions'] ?? 0) > 0
            || $this->toInt($row['clicks'] ?? 0) > 0;
    }

    /**
     * @param array<string, mixed> $rawRow
     * @param array<int, string> $actionTypes
     */
    protected function sumActions(array $rawRow, array $actionTypes): int
    {
        $actions = $rawRow['actions'] ?? [];
        if (!is_array($actions) || count($actions) === 0) {
            return 0;
        }

        $allowed = collect($actionTypes)
            ->map(fn ($type) => trim((string) $type))
            ->filter(fn ($type) => $type !== '')
            ->values()
            ->all();

        if (count($allowed) === 0) {
            return 0;
        }

        $sum = 0.0;
        foreach ($actions as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            $type = trim((string) ($entry['action_type'] ?? ''));
            if (!in_array($type, $allowed, true)) {
                continue;
            }
            $sum += $this->toFloat($entry['value'] ?? 0);
        }

        return (int) round($sum);
    }

    protected function toFloat(mixed $value): float
    {
        if (is_numeric($value)) {
            return (float) $value;
        }
        return 0.0;
    }

    protected function toInt(mixed $value): int
    {
        if (is_numeric($value)) {
            return (int) round((float) $value);
        }
        return 0;
    }

    protected function normalizeDate(string $date): string
    {
        $date = trim($date);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            throw new RuntimeException('Ungültiges Datum. Erwartet: YYYY-MM-DD.');
        }
        return $date;
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array{
     *   date_from: string,
     *   date_to: string,
     *   totals: array<string, mixed>,
     *   accounts: array<int, array<string, mixed>>
     * }
     */
    protected function buildActiveDrilldown(array $rows, string $dateFrom, string $dateTo): array
    {
        $tree = [
            'date_from' => $this->normalizeDate($dateFrom),
            'date_to' => $this->normalizeDate($dateTo),
            '_totals_acc' => $this->newMetricAccumulator(),
            '_accounts' => [],
        ];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $accountId = trim((string) ($row['account_id'] ?? ''));
            if ($accountId === '') {
                $accountId = 'unknown_account';
            }

            if (!isset($tree['_accounts'][$accountId])) {
                $tree['_accounts'][$accountId] = [
                    'id' => $row['account_id'] ?? null,
                    'name' => $row['account_name'] ?? null,
                    'account_number' => $row['account_id'] ?? null,
                    '_acc' => $this->newMetricAccumulator(),
                    '_campaigns' => [],
                ];
            }

            $account =& $tree['_accounts'][$accountId];
            $this->addRowToAccumulator($tree['_totals_acc'], $row);
            $this->addRowToAccumulator($account['_acc'], $row);

            $campaignId = trim((string) ($row['campaign_id'] ?? ''));
            if ($campaignId === '') {
                $campaignId = 'unknown_campaign';
            }

            if (!isset($account['_campaigns'][$campaignId])) {
                $account['_campaigns'][$campaignId] = [
                    'id' => $row['campaign_id'] ?? null,
                    'name' => $row['campaign_name'] ?? null,
                    '_acc' => $this->newMetricAccumulator(),
                    '_adgroups' => [],
                ];
            }

            $campaign =& $account['_campaigns'][$campaignId];
            $this->addRowToAccumulator($campaign['_acc'], $row);

            $adGroupId = trim((string) ($row['adgroup_id'] ?? ''));
            if ($adGroupId === '') {
                $adGroupId = 'unknown_adgroup';
            }

            if (!isset($campaign['_adgroups'][$adGroupId])) {
                $campaign['_adgroups'][$adGroupId] = [
                    'id' => $row['adgroup_id'] ?? null,
                    'name' => $row['adgroup_name'] ?? null,
                    '_acc' => $this->newMetricAccumulator(),
                    '_ads' => [],
                ];
            }

            $adGroup =& $campaign['_adgroups'][$adGroupId];
            $this->addRowToAccumulator($adGroup['_acc'], $row);

            $adId = trim((string) ($row['ad_id'] ?? ''));
            if ($adId === '') {
                $adId = 'unknown_ad';
            }

            if (!isset($adGroup['_ads'][$adId])) {
                $adGroup['_ads'][$adId] = [
                    'id' => $row['ad_id'] ?? null,
                    'name' => $row['ad_name'] ?? null,
                    '_acc' => $this->newMetricAccumulator(),
                ];
            }

            $ad =& $adGroup['_ads'][$adId];
            $this->addRowToAccumulator($ad['_acc'], $row);
        }

        $accounts = [];
        foreach ($tree['_accounts'] as $account) {
            $campaigns = [];
            foreach ($account['_campaigns'] as $campaign) {
                $adGroups = [];
                foreach ($campaign['_adgroups'] as $adGroup) {
                    $ads = [];
                    foreach ($adGroup['_ads'] as $ad) {
                        $ads[] = [
                            'id' => $ad['id'],
                            'name' => $ad['name'],
                            'metrics' => $this->finalizeAccumulator($ad['_acc']),
                        ];
                    }

                    $this->sortBySpendDesc($ads);
                    $adGroups[] = [
                        'id' => $adGroup['id'],
                        'name' => $adGroup['name'],
                        'metrics' => $this->finalizeAccumulator($adGroup['_acc']),
                        'ads' => $ads,
                    ];
                }

                $this->sortBySpendDesc($adGroups);
                $campaigns[] = [
                    'id' => $campaign['id'],
                    'name' => $campaign['name'],
                    'metrics' => $this->finalizeAccumulator($campaign['_acc']),
                    'adgroups' => $adGroups,
                ];
            }

            $this->sortBySpendDesc($campaigns);
            $accounts[] = [
                'id' => $account['id'],
                'name' => $account['name'],
                'account_number' => $account['account_number'],
                'metrics' => $this->finalizeAccumulator($account['_acc']),
                'campaigns' => $campaigns,
            ];
        }

        $this->sortBySpendDesc($accounts);

        return [
            'date_from' => $tree['date_from'],
            'date_to' => $tree['date_to'],
            'totals' => $this->finalizeAccumulator($tree['_totals_acc']),
            'accounts' => $accounts,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function newMetricAccumulator(): array
    {
        return [
            'spend' => 0.0,
            'impressions' => 0,
            'reach' => 0,
            'clicks' => 0,
            'link_clicks' => 0,
            'landing_page_views' => 0,
            'form_views' => 0,
            'leads' => 0,
            'custom_events' => [],
        ];
    }

    /**
     * @param array<string, mixed> $acc
     * @param array<string, mixed> $row
     */
    protected function addRowToAccumulator(array &$acc, array $row): void
    {
        $acc['spend'] += $this->toFloat($row['spend'] ?? 0);
        $acc['impressions'] += $this->toInt($row['impressions'] ?? 0);
        $acc['reach'] += $this->toInt($row['reach'] ?? 0);
        $acc['clicks'] += $this->toInt($row['clicks'] ?? 0);
        $acc['link_clicks'] += $this->toInt($row['link_clicks'] ?? 0);
        $acc['landing_page_views'] += $this->toInt($row['landing_page_views'] ?? 0);
        $acc['form_views'] += $this->toInt($row['form_views'] ?? 0);
        $acc['leads'] += $this->toInt($row['leads'] ?? 0);

        $custom = $row['custom_events'] ?? [];
        if (!is_array($custom)) {
            return;
        }

        foreach ($custom as $label => $meta) {
            $key = trim((string) $label);
            if ($key === '') {
                continue;
            }

            if (!isset($acc['custom_events'][$key])) {
                $acc['custom_events'][$key] = 0;
            }

            $acc['custom_events'][$key] += $this->toInt(is_array($meta) ? ($meta['count'] ?? 0) : 0);
        }
    }

    /**
     * @param array<string, mixed> $acc
     * @return array<string, mixed>
     */
    protected function finalizeAccumulator(array $acc): array
    {
        $spend = $this->toFloat($acc['spend'] ?? 0);
        $impressions = $this->toInt($acc['impressions'] ?? 0);
        $clicks = $this->toInt($acc['clicks'] ?? 0);
        $linkClicks = $this->toInt($acc['link_clicks'] ?? 0);
        $lpViews = $this->toInt($acc['landing_page_views'] ?? 0);
        $formViews = $this->toInt($acc['form_views'] ?? 0);
        $leads = $this->toInt($acc['leads'] ?? 0);

        $customEvents = [];
        $custom = $acc['custom_events'] ?? [];
        if (is_array($custom)) {
            foreach ($custom as $label => $countRaw) {
                $count = $this->toInt($countRaw);
                $customEvents[(string) $label] = [
                    'count' => $count,
                    'cost' => $count > 0 ? $spend / $count : null,
                    'percent' => $impressions > 0 ? ($count / $impressions) * 100 : 0.0,
                ];
            }
        }

        return [
            'spend' => $spend,
            'impressions' => $impressions,
            'reach' => $this->toInt($acc['reach'] ?? 0),
            'clicks' => $clicks,
            'ctr_all_percent' => $impressions > 0 ? ($clicks / $impressions) * 100 : 0.0,
            'link_clicks' => $linkClicks,
            'cost_per_link_click' => $linkClicks > 0 ? $spend / $linkClicks : null,
            'link_ctr_percent' => $impressions > 0 ? ($linkClicks / $impressions) * 100 : 0.0,
            'landing_page_views' => $lpViews,
            'cost_per_landing_page_view' => $lpViews > 0 ? $spend / $lpViews : null,
            'landing_page_view_percent' => $impressions > 0 ? ($lpViews / $impressions) * 100 : 0.0,
            'form_views' => $formViews,
            'cost_per_form_view' => $formViews > 0 ? $spend / $formViews : null,
            'form_view_percent' => $impressions > 0 ? ($formViews / $impressions) * 100 : 0.0,
            'leads' => $leads,
            'cost_per_lead' => $leads > 0 ? $spend / $leads : null,
            'lead_percent' => $impressions > 0 ? ($leads / $impressions) * 100 : 0.0,
            'custom_events' => $customEvents,
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    protected function sortBySpendDesc(array &$rows): void
    {
        usort($rows, function (array $a, array $b): int {
            $aSpend = $this->toFloat(data_get($a, 'metrics.spend', 0));
            $bSpend = $this->toFloat(data_get($b, 'metrics.spend', 0));
            return $bSpend <=> $aSpend;
        });
    }

    /**
     * @return array{data: array<int, array<string, mixed>>, paging: array<string, mixed>}
     */
    protected function graphGetCollection(
        Credential $credential,
        string $path,
        array $fields,
        int $limit,
        ?string $after,
        array $extraParams = []
    ): array {
        $credential = $this->resolveLatestCredential($credential);
        $accessToken = $this->currentAccessTokenForCredential($credential);

        $params = [
            'access_token' => $accessToken,
            'limit' => max(1, min(500, $limit)),
        ];
        if (count($fields) > 0) {
            $params['fields'] = implode(',', $fields);
        }

        if ($after) {
            $params['after'] = $after;
        }
        if (count($extraParams) > 0) {
            $params = array_merge($params, $extraParams);
        }

        $response = Http::get(rtrim(self::GRAPH_BASE_URL, '/') . '/' . ltrim($path, '/'), $params);
        if (!$response->successful()) {
            throw new RuntimeException('Meta Graph Request fehlgeschlagen: ' . $response->body());
        }

        $payload = $response->json();
        if (!is_array($payload)) {
            throw new RuntimeException('Meta Graph Response ist ungültig.');
        }

        return [
            'data' => is_array($payload['data'] ?? null) ? $payload['data'] : [],
            'paging' => is_array($payload['paging'] ?? null) ? $payload['paging'] : [],
        ];
    }

    protected function normalizeAdAccountPath(string $adAccountId): string
    {
        $id = trim($adAccountId);
        if ($id === '') {
            throw new RuntimeException('Ad Account ID darf nicht leer sein.');
        }

        if (str_starts_with($id, 'act_')) {
            return $id;
        }

        return 'act_' . $id;
    }
}
