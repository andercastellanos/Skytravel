/**
 * Publish a new destination (EN + ES) by committing the generated files
 * to a new branch on GitHub and opening a Pull Request for review.
 *
 * Replaces the previous local-disk write flow so this works in production.
 */

const { fetchFile, publishCommit } = require('./_lib/github');

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function respond(statusCode, body) {
    return {
        statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
}

/**
 * Inject a destination card into index.html / index-es.html just before
 * the contact section, after the destinations grid closes.
 */
function injectCard(html, cardHtml) {
    const contactIdx = html.indexOf('<!-- Contact Section');
    if (contactIdx === -1) return null;

    const before = html.substring(0, contactIdx);
    const markers = [
        '      </div>\n    </section>',
        '      </div>\r\n    </section>',
        '</div>\n    </section>',
        '</div>\r\n    </section>'
    ];
    let markerIdx = -1;
    for (const m of markers) {
        markerIdx = before.lastIndexOf(m);
        if (markerIdx !== -1) break;
    }
    if (markerIdx === -1) return null;

    return before.substring(0, markerIdx) + cardHtml + '\n\n' + html.substring(markerIdx);
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }
    if (event.httpMethod !== 'POST') {
        return respond(405, { error: 'Method not allowed' });
    }

    let data;
    try {
        data = JSON.parse(event.body || '{}');
    } catch (e) {
        return respond(400, { error: 'Invalid JSON body' });
    }

    const { fileBase, slug, enHtml, esHtml, cardEN, cardES, cssClass, cssRule, nameEN, nameES } = data;
    if (!fileBase || !slug || !enHtml || !esHtml || !cardEN || !cardES || !cssClass || !cssRule) {
        return respond(400, { error: 'Missing required fields' });
    }

    try {
        // Read existing files from the base branch
        const [indexEn, indexEs, styleCss, netlifyToml] = await Promise.all([
            fetchFile('index.html'),
            fetchFile('index-es.html'),
            fetchFile('style.css'),
            fetchFile('netlify.toml')
        ]);

        // Duplicate check — same CSS class already on the homepage = already published
        if (indexEn.content.indexOf('destination-card ' + cssClass) !== -1) {
            return respond(409, { error: 'Una tarjeta de destino con la clase "' + cssClass + '" ya existe en el sitio.' });
        }

        // Inject EN card into index.html
        const updatedIndexEn = injectCard(indexEn.content, cardEN);
        if (!updatedIndexEn) {
            return respond(500, { error: 'No se encontró el punto de inserción en index.html. Se requiere inserción manual.' });
        }

        // Inject ES card into index-es.html
        const updatedIndexEs = injectCard(indexEs.content, cardES);
        if (!updatedIndexEs) {
            return respond(500, { error: 'No se encontró el punto de inserción en index-es.html. Se requiere inserción manual.' });
        }

        // Append CSS rule (idempotent — skip if rule already present)
        let updatedCss = styleCss.content;
        if (updatedCss.indexOf('.destination-card.' + cssClass) === -1) {
            if (!updatedCss.endsWith('\n')) updatedCss += '\n';
            updatedCss += '\n' + cssRule + '\n';
        }

        // Append redirects to netlify.toml (only what's missing)
        let updatedToml = netlifyToml.content;
        let redirectsToAdd = '';
        if (updatedToml.indexOf('from = "/' + fileBase + '.html"') === -1) {
            redirectsToAdd += '\n[[redirects]]\n  from = "/' + fileBase + '.html"\n  to = "/' + slug + '"\n  status = 301\n  force = true\n';
        }
        if (updatedToml.indexOf('from = "/' + fileBase + '-es.html"') === -1) {
            redirectsToAdd += '\n[[redirects]]\n  from = "/' + fileBase + '-es.html"\n  to = "/' + slug + '-es"\n  status = 301\n  force = true\n';
        }
        if (redirectsToAdd) {
            if (!updatedToml.endsWith('\n')) updatedToml += '\n';
            updatedToml += redirectsToAdd;
        }

        // Build the file list for the commit
        const files = [
            { path: fileBase + '.html', content: enHtml },
            { path: fileBase + '-es.html', content: esHtml },
            { path: 'index.html', content: updatedIndexEn },
            { path: 'index-es.html', content: updatedIndexEs },
            { path: 'style.css', content: updatedCss }
        ];
        if (redirectsToAdd) {
            files.push({ path: 'netlify.toml', content: updatedToml });
        }

        const displayName = nameEN || nameES || slug;
        const result = await publishCommit({
            branchPrefix: 'content/destino',
            slug,
            commitMessage: `Add destination: ${displayName}`,
            prTitle: `New destination: ${displayName}`,
            prBody: [
                `New destination submitted via the live website form.`,
                ``,
                `**Slug:** \`${slug}\``,
                `**Files added:** \`${fileBase}.html\`, \`${fileBase}-es.html\``,
                `**Files modified:** \`index.html\`, \`index-es.html\`, \`style.css\`${redirectsToAdd ? ', `netlify.toml`' : ''}`,
                ``,
                `Review the deploy preview, then merge to publish.`
            ].join('\n'),
            files
        });

        return respond(200, {
            success: true,
            message: 'Destino enviado para revisión. Andrés debe aprobar antes de que aparezca en el sitio.',
            prUrl: result.prUrl,
            prNumber: result.prNumber,
            branchName: result.branchName,
            previewUrl: result.previewUrl
        });

    } catch (err) {
        console.error('deploy-destination error:', err);
        const status = err.status || 500;
        return respond(status >= 400 && status < 600 ? status : 500, {
            error: 'Error al publicar destino: ' + err.message
        });
    }
};
