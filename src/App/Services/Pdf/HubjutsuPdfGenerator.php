<?php

namespace AHerzog\Hubjutsu\App\Services\Pdf;

use App\Models\Media;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\View;

abstract class HubjutsuPdfGenerator
{
    protected Dompdf $dompdf;
    protected string $paper = 'A4';
    protected string $orientation = 'portrait';
    protected array $overrides = [];

    public function __construct(?Options $options = null)
    {
        $options = $options ?? $this->makeOptions();
        $this->dompdf = new Dompdf($options);
    }

    public function setPaperFormat(string $paper, string $orientation = 'portrait'): static
    {
        $this->paper = $paper;
        $this->orientation = $orientation;
        return $this;
    }

    public function withViewData(array $data): static
    {
        $this->overrides = array_merge($this->overrides, $data);
        return $this;
    }

    public function render(array $extra = []): string
    {
        $payload = $this->preparePayload($extra);
        $html = View::make($this->view(), $payload)->render();
        $this->dompdf->setPaper($this->paper, $this->orientation);
        $this->dompdf->loadHtml($html);
        $this->dompdf->render();
        return $this->dompdf->output();
    }

    public function toMedia(array $options = [], array $extra = []): Media
    {
        $pdf = $this->render($extra);
        $private = (bool) ($options['private'] ?? false);
        $filename = $options['filename'] ?? $this->defaultFilename();
        $mimetype = $options['mimetype'] ?? 'application/pdf';

        $media = new Media();
        $media->name = (string) ($options['name'] ?? 'Generated PDF');
        $media->description = (string) ($options['description'] ?? 'Generated PDF');
        $media->mimetype = $mimetype;
        $media->private = $private;
        $media->setContent($pdf, $filename);

        return $media;
    }

    protected function preparePayload(array $extra): array
    {
        $base = [
            'issuer' => $this->issuer(),
            'receiver' => $this->receiver(),
            'pageScript' => $this->pageScript(),
            'metadata' => $this->metadata(),
        ];

        return array_merge(
            $base,
            $this->viewData(),
            $this->overrides,
            $extra
        );
    }

    protected function makeOptions(): Options
    {
        $options = new Options();

        foreach (config('hubjutsu.pdf.options', []) as $key => $value) {
            $options->set($key, $value);
        }

        return $options;
    }

    protected function pageScript(): string
    {
        $config = config('hubjutsu.pdf.page_script', []);
        $x = (int) ($config['x'] ?? 520);
        $y = (int) ($config['y'] ?? 820);
        $font = $config['font'] ?? 'Helvetica';
        $size = (int) ($config['size'] ?? 10);

        return <<<HTML
<script type="text/php">
if (isset(\$pdf)) {
    \$font = \$fontMetrics->getFont("{$font}", "normal");
    \$pdf->page_text({$x}, {$y}, "Seite {PAGE_NUM} von {PAGE_COUNT}", \$font, {$size});
}
</script>
HTML;
    }

    protected function metadata(): array
    {
        return [];
    }

    protected function defaultFilename(): string
    {
        return "generated-pdfs/pdf/" . now()->format('Y/m') . '/' . Str::orderedUuid() . '.pdf';
    }

    protected function viewData(): array
    {
        return [];
    }

    abstract protected function view(): string;

    abstract protected function issuer(): array;

    protected function receiver(): array
    {
        return [];
    }
}
