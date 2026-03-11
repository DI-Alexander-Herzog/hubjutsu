<?php

namespace AHerzog\Hubjutsu\App\Services\Pdf;

use App\Models\Media;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Database\Eloquent\Model;
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

    public function toMedia(
        Model $target,
        string $category,
        array $options = [],
        array $extra = []
    ): Media {
        if (!method_exists($target, 'setMedia') || !method_exists($target, 'media')) {
            throw new \InvalidArgumentException('Target model must use MediaTrait (setMedia/media).');
        }

        $pdf = $this->render($extra);
        $private = (bool) ($options['private'] ?? false);
        $sort = (int) ($options['sort'] ?? 1);
        $filename = $options['filename'] ?? $this->defaultFilename($category);
        $mimetype = $options['mimetype'] ?? 'application/pdf';

        $updateExisting = (bool) ($options['update_existing'] ?? true);
        $media = $updateExisting ? $target->media($category)->first() : null;
        if (!$media instanceof Media) {
            $media = new Media();
        }

        $media->name = (string) ($options['name'] ?? Str::headline(str_replace('_', ' ', $category)));
        $media->description = (string) ($options['description'] ?? 'Generated PDF');
        $media->mimetype = $mimetype;
        $media->private = $private;
        $media->setContent($pdf, $filename);

        $setter = $options['setter'] ?? null;
        if (is_string($setter) && method_exists($target, $setter)) {
            $target->{$setter}($media);
        } else {
            $target->setMedia($media, $category, $sort, $private);
        }

        $stored = $target->media($category)->first();
        if (!$stored instanceof Media) {
            throw new \RuntimeException("Failed to persist media for category [{$category}].");
        }

        return $stored;
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

    protected function defaultFilename(string $category): string
    {
        $slug = Str::slug($category) ?: 'pdf';
        return "generated-pdfs/{$slug}/" . now()->format('Y/m') . '/' . Str::orderedUuid() . '.pdf';
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
