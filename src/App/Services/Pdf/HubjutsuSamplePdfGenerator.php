<?php

namespace AHerzog\Hubjutsu\App\Services\Pdf;

use Carbon\Carbon;

class HubjutsuSamplePdfGenerator extends HubjutsuPdfGenerator
{
    protected function view(): string
    {
        return 'hubjutsu::pdf.sample';
    }

    protected function issuer(): array
    {
        return [
            'company' => config('app.name', 'CHLOFFER GmbH'),
            'street' => 'Brunnenweg 4',
            'zip' => '1010',
            'city' => 'Wien',
            'country' => 'Austria',
            'phone' => '+43 660 123 4567',
            'email' => 'office@chl.gmbh',
            'logo' => asset('storage/img/brandimage.jpeg'),
        ];
    }

    protected function receiver(): array
    {
        return [
            'company' => 'Demo Kunde AG',
            'street' => 'Examplegasse 99',
            'zip' => '4020',
            'city' => 'Linz',
            'country' => 'Austria',
            'phone' => '+43 664 765 4321',
            'email' => 'kunde@example.org',
        ];
    }

    protected function metadata(): array
    {
        return [
            'generatedAt' => Carbon::now()->format('d.m.Y H:i'),
            'document' => 'Hubjutsu Beispielbericht',
        ];
    }

    protected function viewData(): array
    {
        return [
            'documentTitle' => 'Prüfbericht Muster',
            'documentNumber' => 'HUBPDF-001',
            'items' => $this->sampleItems(),
            'notes' => 'Dieser Bericht demonstriert Layout, Seitenzahlen und Beispielitems.',
        ];
    }

    protected function sampleItems(): array
    {
        return [
            [
                'label' => 'Auffanggurt Profi X',
                'inspection' => 'Sichtprüfung + Funktionsprüfung',
                'status' => 'OK',
                'serial' => 'GRZ-PSA-0001',
                'location' => 'Werkstatt 12',
            ],
            [
                'label' => 'Sicherheitskarabiner',
                'inspection' => 'Zugprüfung',
                'status' => 'Nicht OK',
                'serial' => 'KA-2026-15',
                'location' => 'Außenlager',
            ],
            [
                'label' => 'Rettungsleiter T42',
                'inspection' => 'Prüfung der Steigfähigkeit',
                'status' => 'OK',
                'serial' => 'RL-421-01',
                'location' => 'Gebäude 9',
            ],
        ];
    }
}
