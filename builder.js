// builder.js — SwivelGrid Bundle Builder
// Handles extension selection, size estimation, and single-file ESM generation/download.
// No external libraries. Pure fetch() + Blob + URL.createObjectURL.

const EXTENSIONS = [
    {
        name: 'layout-renderer',
        className: 'LayoutRendererExtension',
        path: './extensions/LayoutRendererExtension.js',
        label: 'Layout Renderer',
        desc: 'Table and card grid rendering. Required by all other extensions.',
        kb: 8,
        required: true,
    },
    {
        name: 'templates',
        className: 'TemplateExtension',
        path: './extensions/TemplateExtension.js',
        label: 'Templates',
        desc: 'Cell and header templates with helpers: renderRating, formatDate, formatCurrency, truncate.',
        kb: 5,
        required: false,
    },
    {
        name: 'sorting',
        className: 'SortingExtension',
        path: './extensions/SortingExtension.js',
        label: 'Sorting',
        desc: 'Column click-to-sort with ASC/DESC cycle and custom comparator support.',
        kb: 4,
        required: false,
    },
    {
        name: 'search',
        className: 'SearchExtension',
        path: './extensions/SearchExtension.js',
        label: 'Search',
        desc: 'Bind an external <input> to the grid by CSS selector. Fires swivel:search on each keystroke.',
        kb: 3,
        required: false,
    },
    {
        name: 'pagination',
        className: 'PaginationExtension',
        path: './extensions/PaginationExtension.js',
        label: 'Pagination',
        desc: 'Infinite scroll, page-size control, and load-more callbacks for server-driven data.',
        kb: 6,
        required: false,
    },
    {
        name: 'css-classes',
        className: 'CssClassesExtension',
        path: './extensions/CssClassesExtension.js',
        label: 'CSS Classes',
        desc: 'Apply cellClass, headerClass, and rowClass (static or function) per column definition.',
        kb: 3,
        required: false,
    },
    {
        name: 'accessibility',
        className: 'AccessibilityExtension',
        path: './extensions/AccessibilityExtension.js',
        label: 'Accessibility',
        desc: 'ARIA roles, aria-sort, and keyboard navigation for screen-reader compatibility.',
        kb: 4,
        required: false,
    },
];

const PRESETS = {
    minimal:         ['layout-renderer'],
    standard:        ['layout-renderer', 'templates', 'sorting'],
    'table-focused': ['layout-renderer', 'sorting', 'search', 'pagination'],
    dashboard:       ['layout-renderer', 'templates', 'css-classes'],
    enterprise:      ['layout-renderer', 'templates', 'sorting', 'search', 'pagination', 'css-classes', 'accessibility'],
};

// BaseExtension + SwivelGrid core (not in EXTENSIONS list but always included)
const CORE_KB = 20;

// ─── State ────────────────────────────────────────────────────────────────────

// Start with the "standard" preset active
const checked = new Set(['layout-renderer', 'templates', 'sorting']);

// ─── UI ───────────────────────────────────────────────────────────────────────

function buildExtensionCards() {
    const container = document.getElementById('extension-grid');
    if (!container) return;

    for (const ext of EXTENSIONS) {
        const isChecked = checked.has(ext.name);

        const card = document.createElement('label');
        card.className = 'ext-card' + (ext.required ? ' ext-required' : '');
        card.dataset.name = ext.name;

        card.innerHTML = `
            <div class="ext-card-top">
                <input
                    type="checkbox"
                    class="ext-checkbox"
                    data-name="${ext.name}"
                    ${isChecked || ext.required ? 'checked' : ''}
                    ${ext.required ? 'disabled' : ''}
                >
                <span class="ext-label">${ext.label}</span>
                <span class="ext-kb">${ext.kb} KB</span>
            </div>
            <p class="ext-desc">${ext.desc}</p>
        `;

        container.appendChild(card);

        if (!ext.required) {
            card.querySelector('.ext-checkbox').addEventListener('change', (e) => {
                if (e.target.checked) {
                    checked.add(ext.name);
                } else {
                    checked.delete(ext.name);
                }
                // Clear active preset (custom selection)
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                updateSizeEstimate();
            });
        }
    }

    updateSizeEstimate();
}

function updateSizeEstimate() {
    const kb = CORE_KB + [...checked].reduce((sum, name) => {
        const ext = EXTENSIONS.find(e => e.name === name);
        return sum + (ext ? ext.kb : 0);
    }, 0);

    const el = document.getElementById('size-estimate');
    if (el) el.textContent = `~${kb} KB`;
}

// ─── Presets ──────────────────────────────────────────────────────────────────

function applyPreset(presetName) {
    const features = PRESETS[presetName];
    if (!features) return;

    checked.clear();
    features.forEach(f => checked.add(f));

    document.querySelectorAll('.ext-checkbox').forEach(cb => {
        const name = cb.dataset.name;
        const ext = EXTENSIONS.find(e => e.name === name);
        if (ext && !ext.required) {
            cb.checked = checked.has(name);
        }
    });

    document.querySelectorAll('.preset-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.preset === presetName);
    });

    updateSizeEstimate();
}

// ─── File generation ──────────────────────────────────────────────────────────

function stripModuleStatements(text) {
    return text
        // Strip the single import all 7 extension files share
        .replace(/^import \{ BaseExtension \} from '\.\/BaseExtension\.js';\r?\n?/gm, '')
        // Strip individual default exports (replaced by one block at the end)
        .replace(/^export default \w+;\r?\n?/gm, '')
        // Strip SwivelGrid's named export (re-added in the export block)
        .replace(/^export \{ SwivelGrid \};\r?\n?/gm, '');
}

async function fetchFiles(paths) {
    return Promise.all(
        paths.map(async (path) => {
            const res = await fetch(path);
            if (!res.ok) throw new Error(`Could not load ${path} (HTTP ${res.status})`);
            return res.text();
        })
    );
}

function triggerDownload(content, filename) {
    const blob = new Blob([content], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function generateBundle({ featureNames, bundlePath, bundleClassName, filename, buttonId }) {
    const btn = document.getElementById(buttonId);
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Generating…';

    try {
        const extensionPaths = featureNames
            .map(name => EXTENSIONS.find(e => e.name === name)?.path)
            .filter(Boolean);

        const paths = [
            './extensions/BaseExtension.js',
            './SwivelGrid.js',
            ...extensionPaths,
            bundlePath,
        ];

        const texts = await fetchFiles(paths);
        const stripped = texts.map(stripModuleStatements);

        const exportedNames = [
            'SwivelGrid',
            'BaseExtension',
            ...featureNames.map(n => EXTENSIONS.find(e => e.name === n)?.className).filter(Boolean),
            bundleClassName,
        ];

        const lines = [
            `// SwivelGrid Bundle — ${bundleClassName === 'BundleBuilder' ? 'Custom' : bundleClassName.replace('Bundle', ' Bundle')}`,
            `// Features: ${featureNames.join(', ')}`,
            `// Generated: ${new Date().toISOString()}`,
            `//`,
            `// Usage:`,
            `//   import { SwivelGrid, ${bundleClassName} } from './${filename}';`,
            bundleClassName === 'BundleBuilder'
                ? `//   const exts = new BundleBuilder().addFeature('sorting').build();`
                : `//   await ${bundleClassName}.loadInto(grid);`,
            '',
            stripped.join('\n\n'),
            '',
            `export { ${exportedNames.join(', ')} };`,
            '',
        ];

        triggerDownload(lines.join('\n'), filename);

    } catch (err) {
        console.error('Bundle generation failed:', err);
        alert(
            `Bundle generation failed: ${err.message}\n\n` +
            `Make sure the demo is served via "npm start" and not opened as a local file.`
        );
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// ─── Wire up ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    buildExtensionCards();

    // Mark "standard" as active on load
    document.querySelector('.preset-btn[data-preset="standard"]')?.classList.add('active');

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
    });

    // Custom bundle download
    document.getElementById('builder-download-btn')?.addEventListener('click', () => {
        generateBundle({
            featureNames: [...checked],
            bundlePath: './bundles/BundleBuilder.js',
            bundleClassName: 'BundleBuilder',
            filename: 'swivel-grid-custom.js',
            buttonId: 'builder-download-btn',
        });
    });

    // Standard bundle download
    document.getElementById('standard-download-btn')?.addEventListener('click', () => {
        generateBundle({
            featureNames: ['layout-renderer', 'templates', 'sorting'],
            bundlePath: './bundles/StandardBundle.js',
            bundleClassName: 'StandardBundle',
            filename: 'swivel-grid-standard.js',
            buttonId: 'standard-download-btn',
        });
    });

    // Advanced bundle download
    document.getElementById('advanced-download-btn')?.addEventListener('click', () => {
        generateBundle({
            featureNames: [
                'layout-renderer', 'templates', 'sorting',
                'search', 'pagination', 'css-classes', 'accessibility',
            ],
            bundlePath: './bundles/AdvancedBundle.js',
            bundleClassName: 'AdvancedBundle',
            filename: 'swivel-grid-advanced.js',
            buttonId: 'advanced-download-btn',
        });
    });
});
