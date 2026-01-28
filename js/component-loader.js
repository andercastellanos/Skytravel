/**
 * Component Loader for Sky Travel
 *
 * Loads reusable HTML components via fetch and injects them into the page.
 * CSS is automatically moved to <head> to ensure proper styling.
 *
 * Usage:
 *   <div id="contact-section-container"></div>
 *   <script src="js/component-loader.js"></script>
 *   <script>
 *       loadComponent('contact-section', 'contact-section-container', '20260128');
 *   </script>
 *
 * @see /docs/reusable-components-guide.md for full documentation
 */

/**
 * Loads a reusable HTML component into a container element.
 *
 * @param {string} componentName - Name of the component (matches filename without extension)
 *                                 e.g., 'contact-section' loads components/contact-section.html
 * @param {string} containerId - ID of the container element to inject content into
 * @param {string} [version='1'] - Cache-busting version string (update when component changes)
 * @param {Object} [options={}] - Additional options
 * @param {Function} [options.onLoad] - Callback function called after component is loaded
 * @param {Function} [options.onError] - Callback function called if loading fails
 * @returns {Promise<void>}
 *
 * @example
 * // Basic usage
 * loadComponent('contact-section', 'contact-section-container', '20260128');
 *
 * @example
 * // With callback
 * loadComponent('contact-section', 'contact-section-container', '20260128', {
 *     onLoad: () => console.log('Contact section loaded!'),
 *     onError: (err) => console.error('Failed to load:', err)
 * });
 */
function loadComponent(componentName, containerId, version, options) {
    version = version || '1';
    options = options || {};

    var container = document.getElementById(containerId);
    if (!container) {
        console.warn('Component container not found: #' + containerId);
        return Promise.resolve();
    }

    var basePath = 'components/';
    var cssHref = basePath + componentName + '.css?v=' + version;
    var htmlHref = basePath + componentName + '.html?v=' + version;
    var dataAttr = 'data-component="' + componentName + '"';

    return fetch(htmlHref, { cache: 'no-store' })
        .then(function(response) {
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }
            return response.text();
        })
        .then(function(html) {
            var parser = new DOMParser();
            var doc = parser.parseFromString(html, 'text/html');

            // Extract and move CSS link to <head> (avoid duplicates)
            var link = doc.querySelector('link[data-component="' + componentName + '"]');
            if (link) {
                link.remove(); // Remove from parsed doc
                if (!document.querySelector('link[data-component="' + componentName + '"]')) {
                    link.href = cssHref;
                    document.head.appendChild(link);
                }
            }

            // Inject component markup
            container.innerHTML = doc.body ? doc.body.innerHTML : html;

            // Call onLoad callback if provided
            if (typeof options.onLoad === 'function') {
                options.onLoad(container);
            }
        })
        .catch(function(error) {
            console.error('Error loading component "' + componentName + '":', error);
            if (typeof options.onError === 'function') {
                options.onError(error);
            }
        });
}

/**
 * Loads multiple components in parallel.
 *
 * @param {Array<Object>} components - Array of component configurations
 * @param {string} components[].name - Component name
 * @param {string} components[].container - Container element ID
 * @param {string} [components[].version] - Version string (default: '1')
 * @returns {Promise<void[]>}
 *
 * @example
 * loadComponents([
 *     { name: 'contact-section', container: 'contact-section-container', version: '20260128' },
 *     { name: 'footer', container: 'footer-container', version: '20260128' }
 * ]);
 */
function loadComponents(components) {
    var promises = components.map(function(config) {
        return loadComponent(config.name, config.container, config.version || '1', config.options);
    });
    return Promise.all(promises);
}
