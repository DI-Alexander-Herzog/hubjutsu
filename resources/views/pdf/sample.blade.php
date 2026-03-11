<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {
            margin: 0;
            size: A4;
        }

        body {
            font-family: 'DejaVu Sans', sans-serif;
            margin: 0;
            padding: 0;
            color: #1f2933;
        }

        header, footer {
            position: fixed;
            left: 0;
            right: 0;
            background: #f8fafc;
            padding: 12px 32px;
        }

        header {
            top: 0;
            border-bottom: 1px solid #d1d5db;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }

        footer {
            bottom: 0;
            border-top: 1px solid #d1d5db;
            text-align: center;
            font-size: 10px;
        }

        main {
            margin: 140px 32px 80px;
        }

        .issuer-info, .receiver-info {
            font-size: 11px;
            line-height: 1.4;
        }

        .document-title {
            margin-top: 12px;
            margin-bottom: 10px;
        }

        .document-title h1 {
            margin: 0;
            font-size: 28px;
        }

        .document-title span {
            font-size: 12px;
            color: #6b7280;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 14px;
        }

        th, td {
            padding: 6px 8px;
            border: 1px solid #e5e7eb;
            font-size: 11px;
        }

        th {
            background: #111827;
            color: #fff;
            text-align: left;
            font-weight: 600;
        }

        tr:nth-child(even) td {
            background: #f9fafb;
        }

        .notes {
            margin-top: 18px;
            font-size: 11px;
            line-height: 1.5;
        }
    </style>
</head>
<body>
<header>
    <div class="issuer-info">
        <strong>{{ $issuer['company'] ?? '' }}</strong><br>
        {{ $issuer['street'] ?? '' }} {{ $issuer['zip'] ?? '' }} {{ $issuer['city'] ?? '' }}<br>
        {{ $issuer['country'] ?? '' }}<br>
        {{ $issuer['phone'] ?? '' }} / {{ $issuer['email'] ?? '' }}
    </div>
    <div class="issuer-info" style="text-align:right;">
        @if(!empty($issuer['logo']))
            <img src="{{ $issuer['logo'] }}" style="height: 45px;" alt="Logo">
        @else
            <strong>{{ $metadata['document'] ?? '' }}</strong>
        @endif
        <div style="font-size: 9px; color: #6b7280;">{{ $metadata['generatedAt'] ?? '' }}</div>
    </div>
</header>

<footer>
    {{ $issuer['company'] ?? '' }} · {{ $issuer['street'] ?? '' }}, {{ $issuer['zip'] ?? '' }} {{ $issuer['city'] ?? '' }}
    <span style="display:block; font-size:10px; color:#6b7280;">{{ $metadata['document'] ?? '' }}</span>
</footer>

<main>
    <div class="receiver-info">
        <strong>{{ $receiver['company'] ?? 'Empfänger' }}</strong><br>
        {{ $receiver['street'] ?? '' }} {{ $receiver['zip'] ?? '' }} {{ $receiver['city'] ?? '' }}<br>
        {{ $receiver['country'] ?? '' }} · {{ $receiver['phone'] ?? '' }} · {{ $receiver['email'] ?? '' }}
    </div>

    <div class="document-title">
        <h1>{{ $documentTitle ?? 'Hubjutsu Bericht' }}</h1>
        <span>{{ $documentNumber ?? '' }}</span>
    </div>

    <table>
        <thead>
        <tr>
            <th>Pos</th>
            <th>Produkt/Prüfung</th>
            <th>Ort</th>
            <th>Seriennummer</th>
            <th>Status</th>
        </tr>
        </thead>
        <tbody>
        @php $items = $items ?? []; @endphp
        @forelse ($items as $index => $item)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>
                    <strong>{{ $item['label'] ?? '' }}</strong><br>
                    <small>{{ $item['inspection'] ?? '' }}</small>
                </td>
                <td>{{ $item['location'] ?? '-' }}</td>
                <td>{{ $item['serial'] ?? '-' }}</td>
                <td>{{ $item['status'] ?? '-' }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="5" style="text-align:center;">Keine Einträge</td>
            </tr>
        @endforelse
        </tbody>
    </table>

    @if(!empty($notes))
        <section class="notes">
            {{ $notes }}
        </section>
    @endif
</main>

@if(!empty($pageScript))
    {!! $pageScript !!}
@endif
</body>
</html>
