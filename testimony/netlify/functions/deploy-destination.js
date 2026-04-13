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

function injectCard(html, cardHtml) {
  var contactIdx = html.indexOf('<!-- Contact Section');
  if (contactIdx === -1) return null;

  var before = html.substring(0, contactIdx);
  // Find the closing </div> of destinations-grid + </section> just before the contact comment
  var marker = '      </div>\n    </section>';
  var markerIdx = before.lastIndexOf(marker);
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

  var fileBase = data.fileBase;
  var slug = data.slug;
  var enHtml = data.enHtml;
  var esHtml = data.esHtml;
  var cardEN = data.cardEN;
  var cardES = data.cardES;
  var cssClass = data.cssClass;
  var cssRule = data.cssRule;

  if (!fileBase || !slug || !enHtml || !esHtml || !cardEN || !cardES || !cssClass || !cssRule) {
    return respond(400, { error: 'Missing required fields' });
  }

  var root = process.cwd();

  try {
    // --- Duplicate check ---
    var indexPath = path.join(root, 'index.html');
    var indexContent = fs.readFileSync(indexPath, 'utf8');

    if (indexContent.indexOf('destination-card ' + cssClass) !== -1) {
      return respond(409, { error: 'Una tarjeta de destino con la clase "' + cssClass + '" ya existe en el sitio.' });
    }

    // --- Write destination HTML files ---
    fs.writeFileSync(path.join(root, fileBase + '.html'), enHtml, 'utf8');
    fs.writeFileSync(path.join(root, fileBase + '-es.html'), esHtml, 'utf8');

    // --- Inject EN card into index.html ---
    var updatedIndex = injectCard(indexContent, cardEN);
    if (!updatedIndex) {
      return respond(500, { error: 'No se encontr\u00f3 el punto de inserci\u00f3n en index.html. Se requiere inserci\u00f3n manual.' });
    }
    fs.writeFileSync(indexPath, updatedIndex, 'utf8');

    // --- Inject ES card into index-es.html ---
    var indexEsPath = path.join(root, 'index-es.html');
    var indexEsContent = fs.readFileSync(indexEsPath, 'utf8');
    var updatedIndexEs = injectCard(indexEsContent, cardES);
    if (!updatedIndexEs) {
      return respond(500, { error: 'No se encontr\u00f3 el punto de inserci\u00f3n en index-es.html. Se requiere inserci\u00f3n manual.' });
    }
    fs.writeFileSync(indexEsPath, updatedIndexEs, 'utf8');

    // --- Append CSS rule to style.css ---
    var cssPath = path.join(root, 'style.css');
    var cssContent = fs.readFileSync(cssPath, 'utf8');
    if (cssContent.indexOf('.destination-card.' + cssClass) === -1) {
      if (!cssContent.endsWith('\n')) cssContent += '\n';
      cssContent += '\n' + cssRule + '\n';
      fs.writeFileSync(cssPath, cssContent, 'utf8');
    }

    // --- Append redirects to netlify.toml ---
    var tomlPath = path.join(root, 'netlify.toml');
    var tomlContent = fs.readFileSync(tomlPath, 'utf8');
    var redirectsToAdd = '';

    var fromEN = '/"' + fileBase + '.html"';
    if (tomlContent.indexOf('from = "/' + fileBase + '.html"') === -1) {
      redirectsToAdd += '\n[[redirects]]\n  from = "/' + fileBase + '.html"\n  to = "/' + slug + '"\n  status = 301\n  force = true\n';
    }

    var fromES = '/"' + fileBase + '-es.html"';
    if (tomlContent.indexOf('from = "/' + fileBase + '-es.html"') === -1) {
      redirectsToAdd += '\n[[redirects]]\n  from = "/' + fileBase + '-es.html"\n  to = "/' + slug + '-es"\n  status = 301\n  force = true\n';
    }

    if (redirectsToAdd) {
      if (!tomlContent.endsWith('\n')) tomlContent += '\n';
      tomlContent += redirectsToAdd;
      fs.writeFileSync(tomlPath, tomlContent, 'utf8');
    }

    return respond(200, {
      success: true,
      files: [fileBase + '.html', fileBase + '-es.html'],
      message: 'Destino publicado exitosamente. Las p\u00e1ginas y tarjetas fueron agregadas al sitio.'
    });

  } catch (err) {
    return respond(500, { error: 'Error al escribir archivos: ' + err.message });
  }
};
