/**
 * ============================================
 * SKY TRAVEL JM - RECEIPT FORM HANDLER
 * ============================================
 *
 * Client-side handler for the hidden /recibo page.
 * Handles bilingual toggle, line items, PDF upload,
 * form validation, and submission to Netlify function.
 *
 * Last updated: 2026-03-04
 * ============================================
 */

(function() {
    'use strict';

    // ============================================
    // BILINGUAL TRANSLATIONS
    // ============================================

    var translations = {
        es: {
            pageTitle: 'Generar Recibo',
            customerName: 'Nombre del Cliente',
            customerEmail: 'Correo Electrónico del Cliente',
            date: 'Fecha',
            lineItemsTitle: 'Detalle de Pagos',
            description: 'Descripción',
            method: 'Método',
            amount: 'Monto',
            addRow: '+ Agregar Fila',
            total: 'Total',
            pdfUpload: 'Adjuntar PDF del Recibo',
            pdfHint: 'Solo PDF, máximo 2MB',
            submit: 'Enviar Recibo',
            submitting: 'Enviando...',
            successToast: '¡Recibo enviado exitosamente!',
            errorToast: 'Error al enviar el recibo. Intente de nuevo.',
            nameRequired: 'El nombre del cliente es requerido',
            emailRequired: 'El correo electrónico es requerido',
            emailInvalid: 'Correo electrónico inválido',
            lineItemRequired: 'Agregue al menos un concepto válido',
            pdfInvalidType: 'Solo se aceptan archivos PDF',
            pdfTooLarge: 'El archivo excede 2MB',
            maxRowsReached: 'Máximo 6 filas permitidas',
            methodZelle: 'Zelle',
            methodCash: 'Efectivo',
            methodCard: 'Tarjeta de Crédito',
            methodWire: 'Transferencia Bancaria',
            methodCheck: 'Cheque'
        },
        en: {
            pageTitle: 'Generate Receipt',
            customerName: 'Customer Name',
            customerEmail: 'Customer Email',
            date: 'Date',
            lineItemsTitle: 'Payment Details',
            description: 'Description',
            method: 'Method',
            amount: 'Amount',
            addRow: '+ Add Row',
            total: 'Total',
            pdfUpload: 'Attach Receipt PDF',
            pdfHint: 'PDF only, max 2MB',
            submit: 'Send Receipt',
            submitting: 'Sending...',
            successToast: 'Receipt sent successfully!',
            errorToast: 'Error sending receipt. Please try again.',
            nameRequired: 'Customer name is required',
            emailRequired: 'Email is required',
            emailInvalid: 'Invalid email address',
            lineItemRequired: 'Add at least one valid line item',
            pdfInvalidType: 'Only PDF files are accepted',
            pdfTooLarge: 'File exceeds 2MB',
            maxRowsReached: 'Maximum 6 rows allowed',
            methodZelle: 'Zelle',
            methodCash: 'Cash',
            methodCard: 'Credit Card',
            methodWire: 'Wire Transfer',
            methodCheck: 'Check'
        }
    };

    var currentLang = 'es';
    var pdfBase64 = null;
    var pdfFilename = null;

    // ============================================
    // TOAST NOTIFICATION (same pattern as contact-tracking.js)
    // ============================================

    function showToast(message, type) {
        var container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;';
            document.body.appendChild(container);
        }

        var toast = document.createElement('div');
        toast.textContent = message;

        var bgColor = type === 'success'
            ? 'linear-gradient(135deg, #c8a97e 0%, #b69268 100%)'
            : 'linear-gradient(135deg, #c41e3a 0%, #a01830 100%)';

        toast.style.cssText = 'padding:1rem 1.5rem;border-radius:10px;color:#fff;font-size:0.95rem;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,0.2);max-width:350px;opacity:1;background:' + bgColor + ';animation:slideIn 0.3s ease-out;';

        container.appendChild(toast);

        setTimeout(function() {
            toast.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(function() {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 5000);
    }

    function addToastStyles() {
        if (document.getElementById('toast-styles')) return;
        var style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = '@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes slideOut{from{transform:translateX(0);opacity:1}to{transform:translateX(100%);opacity:0}}';
        document.head.appendChild(style);
    }

    // ============================================
    // LANGUAGE SWITCHER
    // ============================================

    function switchLanguage(lang) {
        currentLang = lang;
        var t = translations[lang];

        // Update toggle buttons active state
        document.querySelectorAll('.lang-btn').forEach(function(btn) {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });

        // Update all translatable elements
        var els = document.querySelectorAll('[data-i18n]');
        els.forEach(function(el) {
            var key = el.getAttribute('data-i18n');
            if (t[key]) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = t[key];
                } else if (el.tagName === 'OPTION' && el.value === '') {
                    // Skip default options
                } else {
                    el.textContent = t[key];
                }
            }
        });

        // Update labels
        var labels = document.querySelectorAll('[data-i18n-label]');
        labels.forEach(function(label) {
            var key = label.getAttribute('data-i18n-label');
            if (t[key]) label.textContent = t[key];
        });

        // Update method dropdowns
        document.querySelectorAll('.li-method').forEach(function(select) {
            var options = select.querySelectorAll('option');
            options[1].textContent = t.methodZelle;
            options[2].textContent = t.methodCash;
            options[3].textContent = t.methodCard;
            options[4].textContent = t.methodWire;
            options[5].textContent = t.methodCheck;
        });

        // Update submit button
        var submitBtn = document.getElementById('submit-btn');
        if (submitBtn && !submitBtn.disabled) {
            submitBtn.textContent = t.submit;
        }

        // Update add row button
        var addBtn = document.getElementById('add-row-btn');
        if (addBtn) addBtn.textContent = t.addRow;

        // Update PDF hint
        var pdfHint = document.getElementById('pdf-hint');
        if (pdfHint) pdfHint.textContent = t.pdfHint;
    }

    // ============================================
    // LINE ITEMS TABLE
    // ============================================

    function getMethodOptions() {
        var t = translations[currentLang];
        return '<option value="">—</option>'
            + '<option value="Zelle">' + t.methodZelle + '</option>'
            + '<option value="Cash">' + t.methodCash + '</option>'
            + '<option value="Credit Card">' + t.methodCard + '</option>'
            + '<option value="Wire Transfer">' + t.methodWire + '</option>'
            + '<option value="Check">' + t.methodCheck + '</option>';
    }

    function addLineItemRow() {
        var tbody = document.getElementById('line-items-body');
        var rowCount = tbody.querySelectorAll('tr').length;

        if (rowCount >= 6) {
            showToast(translations[currentLang].maxRowsReached, 'error');
            return;
        }

        var tr = document.createElement('tr');
        tr.innerHTML = '<td><input type="text" class="li-description form-input" /></td>'
            + '<td><select class="li-method form-input">' + getMethodOptions() + '</select></td>'
            + '<td><input type="number" class="li-amount form-input" min="0" step="0.01" /></td>'
            + '<td><button type="button" class="remove-row-btn" title="Remove">&times;</button></td>';

        tbody.appendChild(tr);

        // Bind amount input to recalc
        tr.querySelector('.li-amount').addEventListener('input', recalcTotal);

        // Bind remove button
        tr.querySelector('.remove-row-btn').addEventListener('click', function() {
            tbody.removeChild(tr);
            recalcTotal();
        });
    }

    function recalcTotal() {
        var inputs = document.querySelectorAll('.li-amount');
        var total = 0;
        inputs.forEach(function(input) {
            var val = parseFloat(input.value);
            if (!isNaN(val)) total += val;
        });
        document.getElementById('receipt-total').textContent = '$' + total.toFixed(2);
    }

    // ============================================
    // PDF UPLOAD HANDLER
    // ============================================

    // Method name mapping (PDF Spanish text -> form dropdown value)
    var methodMap = {
        'zelle': 'Zelle',
        'efectivo': 'Cash',
        'cash': 'Cash',
        'tarjeta de crédito': 'Credit Card',
        'tarjeta de credito': 'Credit Card',
        'tarjeta': 'Credit Card',
        'credit card': 'Credit Card',
        'transferencia bancaria': 'Wire Transfer',
        'transferencia': 'Wire Transfer',
        'wire transfer': 'Wire Transfer',
        'cheque': 'Check',
        'check': 'Check'
    };

    function mapMethod(raw) {
        var lower = (raw || '').toLowerCase().trim();
        return methodMap[lower] || '';
    }

    function convertPdfDate(dateStr) {
        // Convert M/D/YYYY -> YYYY-MM-DD for date input
        var parts = dateStr.trim().split('/');
        if (parts.length === 3) {
            return parts[2] + '-' + parts[0].padStart(2, '0') + '-' + parts[1].padStart(2, '0');
        }
        return dateStr;
    }

    /**
     * Parses a receipt PDF using PDF.js and returns structured data
     */
    async function parsePdfData(arrayBuffer) {
        var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        var page = await pdf.getPage(1);
        var textContent = await page.getTextContent();

        // Group text items into rows by y-coordinate (tolerance 3px)
        var rowMap = {};
        textContent.items.forEach(function(item) {
            if (!item.str.trim()) return;
            var y = Math.round(item.transform[5]);
            // Find existing row within tolerance
            var key = Object.keys(rowMap).find(function(k) {
                return Math.abs(parseInt(k) - y) < 3;
            });
            if (!key) key = String(y);
            if (!rowMap[key]) rowMap[key] = [];
            rowMap[key].push({ text: item.str.trim(), x: item.transform[4] });
        });

        // Sort rows top-to-bottom, cells left-to-right
        var sortedKeys = Object.keys(rowMap).sort(function(a, b) { return parseInt(b) - parseInt(a); });
        var rows = sortedKeys.map(function(key) {
            return rowMap[key].sort(function(a, b) { return a.x - b.x; }).map(function(item) { return item.text; });
        });

        var result = { date: '', customerName: '', lineItems: [] };
        var headerFound = false;

        rows.forEach(function(cells) {
            var joined = cells.join(' ');

            // Find date (skip "Fecha de Pago" header)
            if (!headerFound && joined.match(/Fecha:\s*/)) {
                var match = joined.match(/Fecha:\s*(.+)/);
                if (match) result.date = match[1].trim();
            }

            // Find customer name
            if (joined.match(/Recibido de:\s*/)) {
                var match = joined.match(/Recibido de:\s*(.+)/);
                if (match) result.customerName = match[1].trim();
            }

            // Detect table header
            if (joined.includes('Concepto') && (joined.includes('todo') || joined.includes('Método'))) {
                headerFound = true;
                return;
            }

            // End of table
            if (headerFound && (joined.includes('Gracias') || joined.match(/^\s*Total/))) {
                headerFound = false;
                return;
            }

            // Parse table data rows
            if (headerFound && cells.length >= 3) {
                // Find dollar amount cell
                var amountCell = null;
                var amountIdx = -1;
                for (var i = cells.length - 1; i >= 0; i--) {
                    if (cells[i].match(/\$[\d,.]+/)) {
                        amountCell = cells[i];
                        amountIdx = i;
                        break;
                    }
                }
                if (amountCell && cells[0]) {
                    var method = amountIdx >= 2 ? cells[amountIdx - 1] : '';
                    result.lineItems.push({
                        description: cells[0],
                        method: method,
                        amount: parseFloat(amountCell.replace(/[$,]/g, ''))
                    });
                }
            }
        });

        return result;
    }

    /**
     * Populates form fields from parsed PDF data
     */
    function populateFromPdf(data) {
        // Fill date
        if (data.date) {
            document.getElementById('receipt-date').value = convertPdfDate(data.date);
        }

        // Fill customer name
        if (data.customerName) {
            document.getElementById('customer-name').value = data.customerName;
        }

        // Fill line items
        if (data.lineItems.length > 0) {
            var tbody = document.getElementById('line-items-body');
            // Clear existing rows
            while (tbody.rows.length > 0) {
                tbody.deleteRow(0);
            }

            data.lineItems.forEach(function(item, i) {
                if (i >= 6) return; // max 6 rows

                var tr = document.createElement('tr');
                tr.innerHTML = '<td><input type="text" class="li-description form-input" /></td>'
                    + '<td><select class="li-method form-input">' + getMethodOptions() + '</select></td>'
                    + '<td><input type="number" class="li-amount form-input" min="0" step="0.01" /></td>'
                    + '<td><button type="button" class="remove-row-btn" title="Remove">&times;</button></td>';

                tbody.appendChild(tr);

                // Fill values
                tr.querySelector('.li-description').value = item.description;
                var methodValue = mapMethod(item.method);
                if (methodValue) tr.querySelector('.li-method').value = methodValue;
                if (item.amount > 0) tr.querySelector('.li-amount').value = item.amount.toFixed(2);

                // Bind events
                tr.querySelector('.li-amount').addEventListener('input', recalcTotal);
                tr.querySelector('.remove-row-btn').addEventListener('click', function() {
                    tbody.removeChild(tr);
                    recalcTotal();
                });
            });

            recalcTotal();
        }
    }

    function handlePdfSelect(e) {
        var file = e.target.files[0];
        var t = translations[currentLang];
        var fileNameDisplay = document.getElementById('pdf-filename');

        if (!file) {
            pdfBase64 = null;
            pdfFilename = null;
            fileNameDisplay.textContent = '';
            return;
        }

        // Validate type
        if (file.type !== 'application/pdf') {
            showToast(t.pdfInvalidType, 'error');
            e.target.value = '';
            pdfBase64 = null;
            pdfFilename = null;
            fileNameDisplay.textContent = '';
            return;
        }

        // Validate size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            showToast(t.pdfTooLarge, 'error');
            e.target.value = '';
            pdfBase64 = null;
            pdfFilename = null;
            fileNameDisplay.textContent = '';
            return;
        }

        pdfFilename = file.name;
        fileNameDisplay.textContent = file.name;

        // Read as base64 for submission
        var reader = new FileReader();
        reader.onload = function(evt) {
            var result = evt.target.result;
            pdfBase64 = result.split(',')[1];
        };
        reader.readAsDataURL(file);

        // Also read as ArrayBuffer for PDF.js parsing
        var reader2 = new FileReader();
        reader2.onload = async function(evt) {
            try {
                var data = await parsePdfData(evt.target.result);
                if (data.customerName || data.lineItems.length > 0) {
                    populateFromPdf(data);
                }
            } catch (err) {
                console.warn('PDF auto-fill failed, manual entry available:', err);
            }
        };
        reader2.readAsArrayBuffer(file);
    }

    // ============================================
    // FORM VALIDATION
    // ============================================

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function validateForm() {
        var t = translations[currentLang];
        var errors = [];

        var name = document.getElementById('customer-name').value.trim();
        if (!name) errors.push(t.nameRequired);

        var email = document.getElementById('customer-email').value.trim();
        if (!email) {
            errors.push(t.emailRequired);
        } else if (!isValidEmail(email)) {
            errors.push(t.emailInvalid);
        }

        // Check at least one valid line item
        var rows = document.querySelectorAll('#line-items-body tr');
        var hasValidItem = false;
        rows.forEach(function(row) {
            var desc = row.querySelector('.li-description').value.trim();
            var amount = parseFloat(row.querySelector('.li-amount').value);
            if (desc && amount > 0) hasValidItem = true;
        });
        if (!hasValidItem) errors.push(t.lineItemRequired);

        return errors;
    }

    // ============================================
    // FORM SUBMISSION
    // ============================================

    async function handleSubmit(e) {
        e.preventDefault();

        var t = translations[currentLang];
        var errors = validateForm();

        if (errors.length > 0) {
            showToast(errors[0], 'error');
            return;
        }

        var submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = t.submitting;

        // Collect line items
        var lineItems = [];
        document.querySelectorAll('#line-items-body tr').forEach(function(row) {
            var desc = row.querySelector('.li-description').value.trim();
            var method = row.querySelector('.li-method').value;
            var amount = parseFloat(row.querySelector('.li-amount').value);
            if (desc && amount > 0) {
                lineItems.push({
                    description: desc,
                    method: method,
                    amount: amount
                });
            }
        });

        var payload = {
            customerName: document.getElementById('customer-name').value.trim(),
            email: document.getElementById('customer-email').value.trim(),
            date: document.getElementById('receipt-date').value,
            lineItems: lineItems,
            lang: currentLang
        };

        if (pdfBase64) {
            payload.pdfBase64 = pdfBase64;
            payload.pdfFilename = pdfFilename;
        }

        try {
            var response = await fetch('/.netlify/functions/send-receipt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            var result = await response.json();

            if (response.ok && result.success) {
                showToast(t.successToast, 'success');

                // Reset form
                document.getElementById('receipt-form').reset();
                // Keep only one row
                var tbody = document.getElementById('line-items-body');
                while (tbody.rows.length > 1) {
                    tbody.deleteRow(tbody.rows.length - 1);
                }
                // Clear first row inputs
                var firstRow = tbody.rows[0];
                if (firstRow) {
                    firstRow.querySelectorAll('input').forEach(function(inp) { inp.value = ''; });
                    firstRow.querySelector('select').selectedIndex = 0;
                }
                pdfBase64 = null;
                pdfFilename = null;
                document.getElementById('pdf-filename').textContent = '';
                recalcTotal();

                // Re-fill today's date
                document.getElementById('receipt-date').value = getTodayDate();
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Receipt submission error:', error);
            showToast(t.errorToast, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = t.submit;
        }
    }

    // ============================================
    // UTILITIES
    // ============================================

    function getTodayDate() {
        var d = new Date();
        var month = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        return d.getFullYear() + '-' + month + '-' + day;
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
        addToastStyles();

        // Auto-fill today's date
        var dateInput = document.getElementById('receipt-date');
        if (dateInput) dateInput.value = getTodayDate();

        // Language toggle
        document.querySelectorAll('.lang-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                switchLanguage(btn.dataset.lang);
            });
        });

        // Add row button
        var addBtn = document.getElementById('add-row-btn');
        if (addBtn) addBtn.addEventListener('click', addLineItemRow);

        // Bind amount inputs on initial row
        document.querySelectorAll('.li-amount').forEach(function(input) {
            input.addEventListener('input', recalcTotal);
        });

        // Bind remove buttons on initial row
        document.querySelectorAll('.remove-row-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var row = btn.closest('tr');
                var tbody = row.parentNode;
                if (tbody.rows.length > 1) {
                    tbody.removeChild(row);
                    recalcTotal();
                }
            });
        });

        // PDF input
        var pdfInput = document.getElementById('pdf-upload');
        if (pdfInput) pdfInput.addEventListener('change', handlePdfSelect);

        // Form submission
        var form = document.getElementById('receipt-form');
        if (form) form.addEventListener('submit', handleSubmit);

        // Set initial language
        switchLanguage('es');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
