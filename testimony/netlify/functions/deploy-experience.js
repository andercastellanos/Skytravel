const fs = require('fs');
const path = require('path');

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
 * Inject a gallery card into the correct year section of an experiences landing page.
 * Sections are ordered descending by year (newest first).
 *
 * @param {string} html  - Full HTML content of experiences.html or experiences-es.html
 * @param {string} cardHtml - The gallery-item card HTML to inject
 * @param {number} year  - The year section to inject into
 * @returns {string|null} - Modified HTML, or null on failure
 */
function injectExperienceCard(html, cardHtml, year) {
  var yearStr = String(year);
  var headingTag = '<h2 class="year-heading">' + yearStr + '</h2>';
  var headingIdx = html.indexOf(headingTag);

  if (headingIdx !== -1) {
    // Year section exists -- insert card before the closing </div> of gallery-grid
    // Pattern: the gallery-grid closing </div> followed by </section>
    var searchFrom = headingIdx + headingTag.length;
    var rest = html.substring(searchFrom);

    // Try multiple whitespace patterns for the closing div+section
    var closingPatterns = [
      '            </div>\n        </section>',
      '        </div>\n        </section>',
      '    </div>\n        </section>',
      '        </div>\n    </section>',
      '    </div>\n    </section>'
    ];

    var closingIdx = -1;
    var closingPattern = '';
    for (var i = 0; i < closingPatterns.length; i++) {
      var idx = rest.indexOf(closingPatterns[i]);
      if (idx !== -1 && (closingIdx === -1 || idx < closingIdx)) {
        closingIdx = idx;
        closingPattern = closingPatterns[i];
      }
    }

    if (closingIdx === -1) {
      // Fallback: find the first </section> after the heading, then find the </div> just before it
      var sectionCloseIdx = rest.indexOf('</section>');
      if (sectionCloseIdx === -1) return null;
      var beforeSection = rest.substring(0, sectionCloseIdx);
      var lastDivClose = beforeSection.lastIndexOf('</div>');
      if (lastDivClose === -1) return null;

      var absoluteIdx = searchFrom + lastDivClose;
      return html.substring(0, absoluteIdx) + cardHtml + '\n' + html.substring(absoluteIdx);
    }

    var absoluteIdx = searchFrom + closingIdx;
    return html.substring(0, absoluteIdx) + cardHtml + '\n' + html.substring(absoluteIdx);

  } else {
    // Year section does not exist -- create a new one in chronological (descending) order
    var yearHeadingRegex = /<h2 class="year-heading">(\d{4})<\/h2>/g;
    var match;
    var years = [];
    while ((match = yearHeadingRegex.exec(html)) !== null) {
      years.push({ year: parseInt(match[1], 10), index: match.index });
    }

    var newSection = '\n        <section class="year-section">\n' +
      '            <h2 class="year-heading">' + yearStr + '</h2>\n' +
      '            <div class="gallery-grid">\n' +
      cardHtml + '\n' +
      '            </div>\n' +
      '        </section>\n';

    if (years.length === 0) {
      // No year sections at all -- insert before the contact section container or end of main
      var contactIdx = html.indexOf('<div id="contact-section-container">');
      if (contactIdx === -1) return null;
      return html.substring(0, contactIdx) + newSection + '\n' + html.substring(contactIdx);
    }

    // Find the first existing year that is LESS than the target year
    // Years should be in descending order in the page
    for (var i = 0; i < years.length; i++) {
      if (years[i].year < year) {
        // Insert before the <section> that contains this year heading
        // Walk backwards from the heading to find the <section> tag
        var before = html.substring(0, years[i].index);
        var sectionStart = before.lastIndexOf('<section class="year-section">');
        if (sectionStart === -1) return null;

        // Also try to include any comment before the section (e.g., <!-- 2024 Section -->)
        var commentCheck = html.substring(Math.max(0, sectionStart - 100), sectionStart);
        var commentMatch = commentCheck.match(/<!--[^>]*-->\s*$/);
        if (commentMatch) {
          sectionStart = sectionStart - commentMatch[0].length;
        }

        return html.substring(0, sectionStart) + newSection + '\n        ' + html.substring(sectionStart);
      }
    }

    // All existing years are greater -- append after the last year section
    // Find the </section> closing tag of the last year section
    var lastYear = years[years.length - 1];
    var afterLast = html.substring(lastYear.index);
    var sectionCloseIdx = afterLast.indexOf('</section>');
    if (sectionCloseIdx === -1) return null;
    var insertAt = lastYear.index + sectionCloseIdx + '</section>'.length;

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

  // Only allow in local dev
  if (process.env.CONTEXT === 'production' || process.env.CONTEXT === 'deploy-preview') {
    return respond(403, { error: 'Deploy function is only available in local development' });
  }

  var data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (e) {
    return respond(400, { error: 'Invalid JSON body' });
  }

  var slugEN = data.slugEN;
  var slugES = data.slugES;
  var year = data.year;
  var enHtml = data.enHtml;
  var esHtml = data.esHtml;
  var cardEN = data.cardEN;
  var cardES = data.cardES;

  if (!slugEN || !slugES || !year || !enHtml || !esHtml || !cardEN || !cardES) {
    return respond(400, { error: 'Missing required fields: slugEN, slugES, year, enHtml, esHtml, cardEN, cardES' });
  }

  var root = process.cwd();

  try {
    // --- Duplicate check ---
    var experiencesPath = path.join(root, 'experiences.html');
    var experiencesContent = fs.readFileSync(experiencesPath, 'utf8');

    if (experiencesContent.indexOf('experiences/' + slugEN) !== -1) {
      return respond(409, { error: 'An experience with slug "' + slugEN + '" already exists on the site.' });
    }

    // --- Write EN experience page ---
    var enDir = path.join(root, 'experiences');
    fs.mkdirSync(enDir, { recursive: true });
    fs.writeFileSync(path.join(enDir, slugEN + '.html'), enHtml, 'utf8');

    // --- Write ES experience page ---
    var esDir = path.join(root, 'es', 'experiences');
    fs.mkdirSync(esDir, { recursive: true });
    fs.writeFileSync(path.join(esDir, slugES + '.html'), esHtml, 'utf8');

    // --- Inject EN card into experiences.html ---
    var updatedExperiences = injectExperienceCard(experiencesContent, cardEN, year);
    if (!updatedExperiences) {
      return respond(500, { error: 'Could not find injection point in experiences.html. Manual insertion required.' });
    }
    fs.writeFileSync(experiencesPath, updatedExperiences, 'utf8');

    // --- Inject ES card into experiences-es.html ---
    var experiencesEsPath = path.join(root, 'experiences-es.html');
    var experiencesEsContent = fs.readFileSync(experiencesEsPath, 'utf8');
    var updatedExperiencesEs = injectExperienceCard(experiencesEsContent, cardES, year);
    if (!updatedExperiencesEs) {
      return respond(500, { error: 'Could not find injection point in experiences-es.html. Manual insertion required.' });
    }
    fs.writeFileSync(experiencesEsPath, updatedExperiencesEs, 'utf8');

    // --- Append redirects to netlify.toml ---
    var tomlPath = path.join(root, 'netlify.toml');
    var tomlContent = fs.readFileSync(tomlPath, 'utf8');
    var redirectsToAdd = '';

    if (tomlContent.indexOf('from = "/experiences/' + slugEN + '.html"') === -1) {
      redirectsToAdd += '\n[[redirects]]\n  from = "/experiences/' + slugEN + '.html"\n  to = "/experiences/' + slugEN + '"\n  status = 301\n  force = true\n';
    }

    if (tomlContent.indexOf('from = "/es/experiences/' + slugES + '.html"') === -1) {
      redirectsToAdd += '\n[[redirects]]\n  from = "/es/experiences/' + slugES + '.html"\n  to = "/es/experiences/' + slugES + '"\n  status = 301\n  force = true\n';
    }

    if (redirectsToAdd) {
      if (!tomlContent.endsWith('\n')) tomlContent += '\n';
      tomlContent += redirectsToAdd;
      fs.writeFileSync(tomlPath, tomlContent, 'utf8');
    }

    return respond(200, {
      success: true,
      files: ['experiences/' + slugEN + '.html', 'es/experiences/' + slugES + '.html'],
      message: 'Experiencia publicada exitosamente. Las páginas y tarjetas fueron agregadas al sitio.'
    });

  } catch (err) {
    return respond(500, { error: 'Error writing files: ' + err.message });
  }
};
