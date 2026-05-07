/**
 * Publish a new experience (EN + ES) by committing the generated files
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
 * Inject a gallery card into the correct year section of an experiences page.
 * Years are kept in descending order. Creates a new section if the year
 * doesn't yet exist on the page.
 */
function injectExperienceCard(html, cardHtml, year) {
    const yearStr = String(year);
    const headingTag = '<h2 class="year-heading">' + yearStr + '</h2>';
    const headingIdx = html.indexOf(headingTag);

    if (headingIdx !== -1) {
        const searchFrom = headingIdx + headingTag.length;
        const rest = html.substring(searchFrom);

        const closingPatterns = [
            '            </div>\n        </section>',
            '        </div>\n        </section>',
            '    </div>\n        </section>',
            '        </div>\n    </section>',
            '    </div>\n    </section>'
        ];

        let closingIdx = -1;
        for (const p of closingPatterns) {
            const idx = rest.indexOf(p);
            if (idx !== -1 && (closingIdx === -1 || idx < closingIdx)) {
                closingIdx = idx;
            }
        }

        if (closingIdx === -1) {
            const sectionCloseIdx = rest.indexOf('</section>');
            if (sectionCloseIdx === -1) return null;
            const beforeSection = rest.substring(0, sectionCloseIdx);
            const lastDivClose = beforeSection.lastIndexOf('</div>');
            if (lastDivClose === -1) return null;
            const absoluteIdx = searchFrom + lastDivClose;
            return html.substring(0, absoluteIdx) + cardHtml + '\n' + html.substring(absoluteIdx);
        }

        const absoluteIdx = searchFrom + closingIdx;
        return html.substring(0, absoluteIdx) + cardHtml + '\n' + html.substring(absoluteIdx);

    } else {
        const yearHeadingRegex = /<h2 class="year-heading">(\d{4})<\/h2>/g;
        let match;
        const years = [];
        while ((match = yearHeadingRegex.exec(html)) !== null) {
            years.push({ year: parseInt(match[1], 10), index: match.index });
        }

        const newSection = '\n        <section class="year-section">\n' +
            '            <h2 class="year-heading">' + yearStr + '</h2>\n' +
            '            <div class="gallery-grid">\n' +
            cardHtml + '\n' +
            '            </div>\n' +
            '        </section>\n';

        if (years.length === 0) {
            const contactIdx = html.indexOf('<div id="contact-section-container">');
            if (contactIdx === -1) return null;
            return html.substring(0, contactIdx) + newSection + '\n' + html.substring(contactIdx);
        }

        for (let i = 0; i < years.length; i++) {
            if (years[i].year < year) {
                const before = html.substring(0, years[i].index);
                let sectionStart = before.lastIndexOf('<section class="year-section">');
                if (sectionStart === -1) return null;

                const commentCheck = html.substring(Math.max(0, sectionStart - 100), sectionStart);
                const commentMatch = commentCheck.match(/<!--[^>]*-->\s*$/);
                if (commentMatch) {
                    sectionStart = sectionStart - commentMatch[0].length;
                }

                return html.substring(0, sectionStart) + newSection + '\n        ' + html.substring(sectionStart);
            }
        }

        const lastYear = years[years.length - 1];
        const afterLast = html.substring(lastYear.index);
        const sectionCloseIdx = afterLast.indexOf('</section>');
        if (sectionCloseIdx === -1) return null;
        const insertAt = lastYear.index + sectionCloseIdx + '</section>'.length;
        return html.substring(0, insertAt) + '\n' + newSection + html.substring(insertAt);
    }
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

    const { slugEN, slugES, year, enHtml, esHtml, cardEN, cardES, nameEN, nameES } = data;
    if (!slugEN || !slugES || !year || !enHtml || !esHtml || !cardEN || !cardES) {
        return respond(400, { error: 'Missing required fields: slugEN, slugES, year, enHtml, esHtml, cardEN, cardES' });
    }

    try {
        const [experiencesEn, experiencesEs, netlifyToml] = await Promise.all([
            fetchFile('experiences.html'),
            fetchFile('experiences-es.html'),
            fetchFile('netlify.toml')
        ]);

        // Duplicate check
        if (experiencesEn.content.indexOf('experiences/' + slugEN) !== -1) {
            return respond(409, { error: 'Ya existe una experiencia con el slug "' + slugEN + '" en el sitio.' });
        }

        const updatedExperiencesEn = injectExperienceCard(experiencesEn.content, cardEN, year);
        if (!updatedExperiencesEn) {
            return respond(500, { error: 'No se encontró el punto de inserción en experiences.html. Se requiere inserción manual.' });
        }

        const updatedExperiencesEs = injectExperienceCard(experiencesEs.content, cardES, year);
        if (!updatedExperiencesEs) {
            return respond(500, { error: 'No se encontró el punto de inserción en experiences-es.html. Se requiere inserción manual.' });
        }

        // Append redirects
        let updatedToml = netlifyToml.content;
        let redirectsToAdd = '';
        if (updatedToml.indexOf('from = "/experiences/' + slugEN + '.html"') === -1) {
            redirectsToAdd += '\n[[redirects]]\n  from = "/experiences/' + slugEN + '.html"\n  to = "/experiences/' + slugEN + '"\n  status = 301\n  force = true\n';
        }
        if (updatedToml.indexOf('from = "/es/experiences/' + slugES + '.html"') === -1) {
            redirectsToAdd += '\n[[redirects]]\n  from = "/es/experiences/' + slugES + '.html"\n  to = "/es/experiences/' + slugES + '"\n  status = 301\n  force = true\n';
        }
        if (redirectsToAdd) {
            if (!updatedToml.endsWith('\n')) updatedToml += '\n';
            updatedToml += redirectsToAdd;
        }

        const files = [
            { path: 'experiences/' + slugEN + '.html', content: enHtml },
            { path: 'es/experiences/' + slugES + '.html', content: esHtml },
            { path: 'experiences.html', content: updatedExperiencesEn },
            { path: 'experiences-es.html', content: updatedExperiencesEs }
        ];
        if (redirectsToAdd) {
            files.push({ path: 'netlify.toml', content: updatedToml });
        }

        const displayName = nameEN || nameES || slugEN;
        const result = await publishCommit({
            branchPrefix: 'content/experiencia',
            slug: slugEN,
            commitMessage: `Add experience: ${displayName} (${year})`,
            prTitle: `New experience: ${displayName} (${year})`,
            prBody: [
                `New experience submitted via the live website form.`,
                ``,
                `**Year:** ${year}`,
                `**Slug (EN):** \`${slugEN}\``,
                `**Slug (ES):** \`${slugES}\``,
                `**Files added:** \`experiences/${slugEN}.html\`, \`es/experiences/${slugES}.html\``,
                `**Files modified:** \`experiences.html\`, \`experiences-es.html\`${redirectsToAdd ? ', `netlify.toml`' : ''}`,
                ``,
                `Review the deploy preview, then merge to publish.`
            ].join('\n'),
            files
        });

        return respond(200, {
            success: true,
            message: 'Experiencia enviada para revisión. Andrés debe aprobar antes de que aparezca en el sitio.',
            prUrl: result.prUrl,
            prNumber: result.prNumber,
            branchName: result.branchName,
            previewUrl: result.previewUrl
        });

    } catch (err) {
        console.error('deploy-experience error:', err);
        const status = err.status || 500;
        return respond(status >= 400 && status < 600 ? status : 500, {
            error: 'Error al publicar experiencia: ' + err.message
        });
    }
};
