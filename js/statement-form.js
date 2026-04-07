/**
 * ============================================
 * SKY TRAVEL JM - STATEMENT FORM HANDLER
 * ============================================
 *
 * Client-side handler for the hidden /estado page.
 * Handles bilingual toggle, currency toggle, pilgrim list,
 * services table, payment plan, balance, PDF upload,
 * form validation, and submission to Netlify function.
 *
 * Last updated: 2026-03-06
 * ============================================
 */

(function() {
    'use strict';

    // ============================================
    // BILINGUAL TRANSLATIONS
    // ============================================

    var translations = {
        es: {
            pageTitle: 'Estado de Cuenta',
            customerName: 'Nombre del Cliente',
            customerEmail: 'Correo Electrónico del Cliente',
            date: 'Fecha',
            pilgrimsTitle: 'Peregrinos',
            pilgrimPlaceholder: 'Nombre del peregrino',
            addPilgrim: '+ Agregar Peregrino',
            servicesTitle: 'Servicios',
            description: 'Descripción',
            qty: 'Cantidad',
            unitPrice: 'Valor Unitario',
            rowTotal: 'Valor Total',
            addService: '+ Agregar Servicio',
            grandTotal: 'VALOR TOTAL',
            paymentPlanTitle: 'Plan de Pagos',
            value: 'Valor',
            status: 'Estado',
            statusPaid: 'Pagado',
            statusPending: 'Pendiente',
            addPayment: '+ Agregar Pago',
            balanceTitle: 'Balance',
            balanceTotal: 'Valor Total',
            balancePaid: 'Valor Abonado',
            balancePending: 'Valor Pendiente',
            balanceRefund: 'Valor Pendiente Devolución',
            pdfUpload: 'Adjuntar PDF del Estado de Cuenta',
            pdfHint: 'Solo PDF, máximo 2MB',
            submit: 'Enviar Estado de Cuenta',
            submitting: 'Enviando...',
            successToast: '¡Estado de cuenta enviado exitosamente!',
            errorToast: 'Error al enviar el estado de cuenta. Intente de nuevo.',
            nameRequired: 'El nombre del cliente es requerido',
            emailRequired: 'El correo electrónico es requerido',
            emailInvalid: 'Correo electrónico inválido',
            serviceRequired: 'Agregue al menos un servicio válido',
            pdfInvalidType: 'Solo se aceptan archivos PDF',
            pdfTooLarge: 'El archivo excede 2MB',
            maxServicesReached: 'Máximo 6 servicios permitidos',
            maxPaymentsReached: 'Máximo 10 pagos permitidos',
            maxPilgrimsReached: 'Máximo 10 peregrinos permitidos'
        },
        en: {
            pageTitle: 'Account Statement',
            customerName: 'Customer Name',
            customerEmail: 'Customer Email',
            date: 'Date',
            pilgrimsTitle: 'Pilgrims',
            pilgrimPlaceholder: 'Pilgrim name',
            addPilgrim: '+ Add Pilgrim',
            servicesTitle: 'Services',
            description: 'Description',
            qty: 'Quantity',
            unitPrice: 'Unit Price',
            rowTotal: 'Total',
            addService: '+ Add Service',
            grandTotal: 'GRAND TOTAL',
            paymentPlanTitle: 'Payment Plan',
            value: 'Value',
            status: 'Status',
            statusPaid: 'Paid',
            statusPending: 'Pending',
            addPayment: '+ Add Payment',
            balanceTitle: 'Balance',
            balanceTotal: 'Total Value',
            balancePaid: 'Amount Paid',
            balancePending: 'Amount Pending',
            balanceRefund: 'Refund Amount Due',
            pdfUpload: 'Attach Statement PDF',
            pdfHint: 'PDF only, max 2MB',
            submit: 'Send Statement',
            submitting: 'Sending...',
            successToast: 'Statement sent successfully!',
            errorToast: 'Error sending statement. Please try again.',
            nameRequired: 'Customer name is required',
            emailRequired: 'Email is required',
            emailInvalid: 'Invalid email address',
            serviceRequired: 'Add at least one valid service',
            pdfInvalidType: 'Only PDF files are accepted',
            pdfTooLarge: 'File exceeds 2MB',
            maxServicesReached: 'Maximum 6 services allowed',
            maxPaymentsReached: 'Maximum 10 payments allowed',
            maxPilgrimsReached: 'Maximum 10 pilgrims allowed'
        }
    };

    var currentLang = 'es';
    var currentCurrency = '$';
    var pdfBase64 = null;
    var pdfFilename = null;

    // ============================================
    // TOAST NOTIFICATION
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
        document.querySelectorAll('[data-i18n]').forEach(function(el) {
            var key = el.getAttribute('data-i18n');
            if (t[key]) el.textContent = t[key];
        });

        // Update labels
        document.querySelectorAll('[data-i18n-label]').forEach(function(label) {
            var key = label.getAttribute('data-i18n-label');
            if (t[key]) label.textContent = t[key];
        });

        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
            var key = el.getAttribute('data-i18n-placeholder');
            if (t[key]) el.placeholder = t[key];
        });

        // Update status dropdowns
        document.querySelectorAll('.pp-status').forEach(function(select) {
            var options = select.querySelectorAll('option');
            if (options[0]) options[0].textContent = t.statusPaid;
            if (options[1]) options[1].textContent = t.statusPending;
        });

        // Update submit button
        var submitBtn = document.getElementById('submit-btn');
        if (submitBtn && !submitBtn.disabled) submitBtn.textContent = t.submit;

        // Update add buttons
        var addPilgrimBtn = document.getElementById('add-pilgrim-btn');
        if (addPilgrimBtn) addPilgrimBtn.textContent = t.addPilgrim;

        var addServiceBtn = document.getElementById('add-service-btn');
        if (addServiceBtn) addServiceBtn.textContent = t.addService;

        var addPaymentBtn = document.getElementById('add-payment-btn');
        if (addPaymentBtn) addPaymentBtn.textContent = t.addPayment;

        // Update PDF hint
        var pdfHint = document.getElementById('pdf-hint');
        if (pdfHint) pdfHint.textContent = t.pdfHint;

        // Update all currency displays
        updateAllCurrencyDisplays();
    }

    // ============================================
    // CURRENCY TOGGLE
    // ============================================

    function switchCurrency(cur) {
        currentCurrency = cur;
        document.querySelectorAll('.currency-btn').forEach(function(btn) {
            btn.classList.toggle('active', btn.dataset.currency === cur);
        });
        updateAllCurrencyDisplays();
    }

    function updateAllCurrencyDisplays() {
        recalcServicesTotal();
        recalcBalance();
    }

    // ============================================
    // PILGRIMS LIST
    // ============================================

    function addPilgrimRow(name) {
        var container = document.getElementById('pilgrims-list');
        var count = container.querySelectorAll('.pilgrim-row').length;

        if (count >= 10) {
            showToast(translations[currentLang].maxPilgrimsReached, 'error');
            return;
        }

        var row = document.createElement('div');
        row.className = 'pilgrim-row';
        row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center;';
        row.innerHTML = '<input type="text" class="pilgrim-name form-input" data-i18n-placeholder="pilgrimPlaceholder" placeholder="' + translations[currentLang].pilgrimPlaceholder + '" style="flex:1;" />'
            + '<button type="button" class="remove-row-btn" title="Remove">&times;</button>';

        container.appendChild(row);

        if (name) row.querySelector('.pilgrim-name').value = name;

        row.querySelector('.remove-row-btn').addEventListener('click', function() {
            container.removeChild(row);
        });
    }

    // ============================================
    // SERVICES TABLE
    // ============================================

    function addServiceRow(data) {
        var tbody = document.getElementById('services-body');
        var rowCount = tbody.querySelectorAll('tr').length;

        if (rowCount >= 6) {
            showToast(translations[currentLang].maxServicesReached, 'error');
            return;
        }

        var tr = document.createElement('tr');
        tr.innerHTML = '<td><textarea class="svc-description form-input" rows="1" style="resize:none;overflow:hidden;"></textarea></td>'
            + '<td><input type="number" class="svc-qty form-input" min="0" step="1" value="1" /></td>'
            + '<td><input type="number" class="svc-unit-price form-input" min="0" step="0.01" /></td>'
            + '<td class="svc-row-total" style="text-align:right;font-weight:600;color:#2c3e50;padding:6px 8px;">' + currentCurrency + '0.00</td>'
            + '<td><button type="button" class="remove-row-btn" title="Remove">&times;</button></td>';

        tbody.appendChild(tr);

        if (data) {
            if (data.description) tr.querySelector('.svc-description').value = data.description;
            if (data.qty) tr.querySelector('.svc-qty').value = data.qty;
            if (data.unitPrice) tr.querySelector('.svc-unit-price').value = data.unitPrice;
        }

        // Auto-resize description textarea
        var desc = tr.querySelector('.svc-description');
        function autoResize() {
            desc.style.height = 'auto';
            desc.style.height = desc.scrollHeight + 'px';
        }
        desc.addEventListener('input', autoResize);
        if (data && data.description) setTimeout(autoResize, 0);

        // Bind events
        tr.querySelector('.svc-qty').addEventListener('input', recalcServicesTotal);
        tr.querySelector('.svc-unit-price').addEventListener('input', recalcServicesTotal);

        tr.querySelector('.remove-row-btn').addEventListener('click', function() {
            tbody.removeChild(tr);
            recalcServicesTotal();
        });

        recalcServicesTotal();
    }

    function recalcServicesTotal() {
        var total = 0;
        document.querySelectorAll('#services-body tr').forEach(function(row) {
            var qty = parseFloat(row.querySelector('.svc-qty').value) || 0;
            var unitPrice = parseFloat(row.querySelector('.svc-unit-price').value) || 0;
            var rowTotal = qty * unitPrice;
            row.querySelector('.svc-row-total').textContent = currentCurrency + formatMoney(rowTotal);
            total += rowTotal;
        });
        document.getElementById('services-grand-total').textContent = currentCurrency + formatMoney(total);

        // Update balance total too
        recalcBalance();
    }

    // ============================================
    // PAYMENT PLAN TABLE
    // ============================================

    function getStatusOptions() {
        var t = translations[currentLang];
        return '<option value="Pagado">' + t.statusPaid + '</option>'
            + '<option value="Pendiente">' + t.statusPending + '</option>';
    }

    function addPaymentRow(data) {
        var tbody = document.getElementById('payment-plan-body');
        var rowCount = tbody.querySelectorAll('tr').length;

        if (rowCount >= 10) {
            showToast(translations[currentLang].maxPaymentsReached, 'error');
            return;
        }

        var tr = document.createElement('tr');
        tr.innerHTML = '<td><input type="text" class="pp-description form-input" /></td>'
            + '<td><input type="number" class="pp-value form-input" min="0" step="0.01" /></td>'
            + '<td><select class="pp-status form-input">' + getStatusOptions() + '</select></td>'
            + '<td><button type="button" class="remove-row-btn" title="Remove">&times;</button></td>';

        tbody.appendChild(tr);

        if (data) {
            if (data.description) tr.querySelector('.pp-description').value = data.description;
            if (data.value) tr.querySelector('.pp-value').value = data.value;
            if (data.status) tr.querySelector('.pp-status').value = data.status;
        }

        // Bind events
        tr.querySelector('.pp-value').addEventListener('input', recalcBalance);
        tr.querySelector('.pp-status').addEventListener('change', recalcBalance);

        tr.querySelector('.remove-row-btn').addEventListener('click', function() {
            tbody.removeChild(tr);
            recalcBalance();
        });

        recalcBalance();
    }

    function recalcBalance() {
        // Total from services
        var servicesTotal = 0;
        document.querySelectorAll('#services-body tr').forEach(function(row) {
            var qty = parseFloat(row.querySelector('.svc-qty').value) || 0;
            var unitPrice = parseFloat(row.querySelector('.svc-unit-price').value) || 0;
            servicesTotal += qty * unitPrice;
        });

        // Paid from payment plan rows marked as Pagado
        var paidTotal = 0;
        document.querySelectorAll('#payment-plan-body tr').forEach(function(row) {
            var val = parseFloat(row.querySelector('.pp-value').value) || 0;
            var status = row.querySelector('.pp-status').value;
            if (status === 'Pagado') {
                paidTotal += val;
            }
        });

        var diff = servicesTotal - paidTotal;
        var pendingTotal = diff > 0 ? diff : 0;
        var refundAmount = diff < 0 ? Math.abs(diff) : 0;

        document.getElementById('balance-total').textContent = currentCurrency + formatMoney(servicesTotal);
        document.getElementById('balance-paid').textContent = currentCurrency + formatMoney(paidTotal);
        document.getElementById('balance-pending').textContent = currentCurrency + formatMoney(pendingTotal);

        var refundRow = document.getElementById('balance-refund-row');
        var refundCell = document.getElementById('balance-refund');
        if (refundAmount > 0) {
            refundRow.style.display = '';
            refundCell.textContent = currentCurrency + formatMoney(refundAmount);
        } else {
            refundRow.style.display = 'none';
        }
    }

    // ============================================
    // PDF UPLOAD HANDLER
    // ============================================

    /**
     * Parses an estado de cuenta PDF using PDF.js
     */
    async function parsePdfData(arrayBuffer) {
        var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        var allRows = [];

        // Parse all pages
        for (var p = 1; p <= pdf.numPages; p++) {
            var page = await pdf.getPage(p);
            var textContent = await page.getTextContent();

            var rowMap = {};
            textContent.items.forEach(function(item) {
                if (!item.str.trim()) return;
                var y = Math.round(item.transform[5]);
                var key = Object.keys(rowMap).find(function(k) {
                    return Math.abs(parseInt(k) - y) < 3;
                });
                if (!key) key = String(y);
                if (!rowMap[key]) rowMap[key] = [];
                rowMap[key].push({ text: item.str.trim(), x: item.transform[4] });
            });

            var sortedKeys = Object.keys(rowMap).sort(function(a, b) { return parseInt(b) - parseInt(a); });
            sortedKeys.forEach(function(key) {
                allRows.push(rowMap[key].sort(function(a, b) { return a.x - b.x; }).map(function(item) { return item.text; }));
            });
        }

        var result = {
            customerName: '',
            pilgrims: [],
            services: [],
            paymentPlan: [],
            balance: { total: 0, paid: 0, pending: 0 }
        };

        var section = '';
        var pendingServiceDesc = '';
        var pendingPayDesc = '';

        allRows.forEach(function(cells) {
            var joined = cells.join(' ');

            // Detect customer name
            if (joined.match(/Cliente:\s*/i)) {
                var match = joined.match(/Cliente:\s*(.+)/i);
                if (match) result.customerName = match[1].trim();
                return;
            }

            // Detect services table header row (Descripción + Cantidad) — can appear
            // directly after pilgrims without a "Servicios" label in the PDF
            var isServicesHeader = joined.match(/Descripci/i) && joined.match(/Cantidad/i);

            // Detect sections
            if (joined.match(/Peregrinos/i) && !isServicesHeader) { section = 'pilgrims'; return; }
            if (isServicesHeader) { section = 'services'; return; }
            if (joined.match(/Servicios/i) && cells.length <= 2) { section = 'services-header'; return; }
            if (joined.match(/Plan de Pago/i)) { section = 'payment-header'; return; }
            if (joined.match(/Balance/i) && !joined.match(/\$/)) { section = 'balance'; return; }

            // Skip table headers (when "Servicios" label is separate from column headers)
            if (section === 'services-header' && (joined.match(/Descripci/i) || joined.match(/Cantidad/i))) {
                section = 'services';
                return;
            }
            if (section === 'payment-header' && (joined.match(/Descripci/i) || joined.match(/Valor/i))) {
                section = 'payment';
                return;
            }

            // Parse pilgrims (bullet list items)
            if (section === 'pilgrims') {
                var name = joined.replace(/^[\-•·]\s*/, '').trim();
                if (name && !name.match(/Servicios/i)) {
                    result.pilgrims.push(name);
                } else if (name.match(/Servicios/i)) {
                    section = 'services-header';
                }
                return;
            }

            // Parse services rows
            if (section === 'services') {
                // End of services section
                if (joined.match(/VALOR TOTAL/i) || joined.match(/GRAND TOTAL/i)) {
                    section = '';
                    return;
                }
                if (joined.match(/Plan de Pago/i)) {
                    section = 'payment-header';
                    return;
                }

                // Try to extract: description, qty, unit price, total
                // The qty/unitPrice/total are the LAST 2-3 numbers in the row.
                // Numbers earlier in the row (like years embedded in descriptions
                // such as "Peregrinación Mariana 2026") stay in the description.
                var numericPositions = [];
                cells.forEach(function(cell, i) {
                    var cleaned = cell.replace(/[$€,]/g, '').trim();
                    if (cleaned.match(/^\d+(\.\d+)?$/) && parseFloat(cleaned) >= 0) {
                        numericPositions.push({ index: i, value: parseFloat(cleaned) });
                    }
                });

                // Take the last 3 numbers (qty, unitPrice, total) — or fewer if less exist
                var dataPositions = numericPositions.slice(-3);
                var dataIndices = dataPositions.map(function(p) { return p.index; });

                var descParts = [];
                if (pendingServiceDesc) {
                    descParts.push(pendingServiceDesc);
                    pendingServiceDesc = '';
                }
                cells.forEach(function(cell, i) {
                    if (dataIndices.indexOf(i) === -1) {
                        descParts.push(cell);
                    }
                });

                if (descParts.length > 0 && dataPositions.length >= 2) {
                    result.services.push({
                        description: descParts.join(' '),
                        qty: dataPositions[0].value,
                        unitPrice: dataPositions[1].value
                    });
                } else if (dataPositions.length < 2 && descParts.length > 0) {
                    // Row with no amounts — likely a wrapped description continuation.
                    // Append to the LAST service if one was just pushed, otherwise store as pending.
                    if (result.services.length > 0 && !pendingServiceDesc) {
                        result.services[result.services.length - 1].description += ' ' + descParts.join(' ');
                    } else {
                        pendingServiceDesc = (pendingServiceDesc ? pendingServiceDesc + ' ' : '') + descParts.join(' ');
                    }
                }
                return;
            }

            // Parse payment plan rows
            if (section === 'payment') {
                if (joined.match(/Balance/i) && !joined.match(/\$/)) {
                    section = 'balance';
                    return;
                }

                var payAmount = null;
                var payDesc = [];
                var payStatus = '';

                // Prepend any pending description from a previous wrapped line
                if (pendingPayDesc) {
                    payDesc.push(pendingPayDesc);
                    pendingPayDesc = '';
                }

                cells.forEach(function(cell) {
                    if (cell.match(/Pagado/i) || cell.match(/Paid/i)) {
                        payStatus = 'Pagado';
                    } else if (cell.match(/Pendiente/i) || cell.match(/Pending/i)) {
                        payStatus = 'Pendiente';
                    } else {
                        var cleaned = cell.replace(/[$€,]/g, '').trim();
                        if (cleaned.match(/^\d+(\.\d+)?$/) && payAmount === null) {
                            payAmount = parseFloat(cleaned);
                        } else {
                            payDesc.push(cell);
                        }
                    }
                });

                if (payDesc.length > 0 && payAmount !== null) {
                    result.paymentPlan.push({
                        description: payDesc.join(' '),
                        value: payAmount,
                        status: payStatus || 'Pendiente'
                    });
                } else if (payAmount === null && payDesc.length > 0 && !payStatus) {
                    // Row with no amount — likely a wrapped description continuation.
                    // Append to the LAST payment if one was just pushed, otherwise store as pending.
                    if (result.paymentPlan.length > 0 && !pendingPayDesc) {
                        result.paymentPlan[result.paymentPlan.length - 1].description += ' ' + payDesc.join(' ');
                    } else {
                        pendingPayDesc = (pendingPayDesc ? pendingPayDesc + ' ' : '') + payDesc.join(' ');
                    }
                }
                return;
            }

            // Parse balance
            if (section === 'balance') {
                if (joined.match(/Total/i) && !joined.match(/Abonado/i) && !joined.match(/Pendiente/i) && !joined.match(/Paid/i)) {
                    var m = joined.match(/[$€]?\s*([\d,.]+)/);
                    if (m) result.balance.total = parseFloat(m[1].replace(/,/g, ''));
                }
                if (joined.match(/Abonado/i) || joined.match(/Paid/i)) {
                    var m = joined.match(/[$€]?\s*([\d,.]+)/);
                    if (m) result.balance.paid = parseFloat(m[1].replace(/,/g, ''));
                }
                if (joined.match(/Pendiente/i) || joined.match(/Pending/i)) {
                    var m = joined.match(/[$€]?\s*([\d,.]+)/);
                    if (m) result.balance.pending = parseFloat(m[1].replace(/,/g, ''));
                }
            }
        });

        return result;
    }

    /**
     * Populates form fields from parsed PDF data
     */
    function populateFromPdf(data) {
        if (data.customerName) {
            document.getElementById('customer-name').value = data.customerName;
        }

        // Populate pilgrims
        if (data.pilgrims.length > 0) {
            var container = document.getElementById('pilgrims-list');
            // Clear existing
            while (container.firstChild) container.removeChild(container.firstChild);
            data.pilgrims.forEach(function(name) {
                if (data.pilgrims.indexOf(name) < 10) addPilgrimRow(name);
            });
        }

        // Populate services
        if (data.services.length > 0) {
            var tbody = document.getElementById('services-body');
            while (tbody.rows.length > 0) tbody.deleteRow(0);
            data.services.forEach(function(item, i) {
                if (i < 6) addServiceRow(item);
            });
        }

        // Populate payment plan
        if (data.paymentPlan.length > 0) {
            var tbody = document.getElementById('payment-plan-body');
            while (tbody.rows.length > 0) tbody.deleteRow(0);
            data.paymentPlan.forEach(function(item, i) {
                if (i < 10) addPaymentRow(item);
            });
        }

        recalcServicesTotal();
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

        if (file.type !== 'application/pdf') {
            showToast(t.pdfInvalidType, 'error');
            e.target.value = '';
            pdfBase64 = null;
            pdfFilename = null;
            fileNameDisplay.textContent = '';
            return;
        }

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
            pdfBase64 = evt.target.result.split(',')[1];
        };
        reader.readAsDataURL(file);

        // Also read as ArrayBuffer for PDF.js parsing
        var reader2 = new FileReader();
        reader2.onload = async function(evt) {
            try {
                var data = await parsePdfData(evt.target.result);
                if (data.customerName || data.services.length > 0 || data.pilgrims.length > 0) {
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

        // Check at least one valid service
        var rows = document.querySelectorAll('#services-body tr');
        var hasValidService = false;
        rows.forEach(function(row) {
            var desc = row.querySelector('.svc-description').value.trim();
            var qty = parseFloat(row.querySelector('.svc-qty').value);
            var unitPrice = parseFloat(row.querySelector('.svc-unit-price').value);
            if (desc && qty > 0 && unitPrice > 0) hasValidService = true;
        });
        if (!hasValidService) errors.push(t.serviceRequired);

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

        // Collect pilgrims
        var pilgrims = [];
        document.querySelectorAll('.pilgrim-name').forEach(function(input) {
            var val = input.value.trim();
            if (val) pilgrims.push(val);
        });

        // Collect services
        var services = [];
        document.querySelectorAll('#services-body tr').forEach(function(row) {
            var desc = row.querySelector('.svc-description').value.trim();
            var qty = parseFloat(row.querySelector('.svc-qty').value);
            var unitPrice = parseFloat(row.querySelector('.svc-unit-price').value);
            if (desc && qty > 0 && unitPrice > 0) {
                services.push({ description: desc, qty: qty, unitPrice: unitPrice });
            }
        });

        // Collect payment plan
        var paymentPlan = [];
        document.querySelectorAll('#payment-plan-body tr').forEach(function(row) {
            var desc = row.querySelector('.pp-description').value.trim();
            var val = parseFloat(row.querySelector('.pp-value').value);
            var status = row.querySelector('.pp-status').value;
            if (desc && val > 0) {
                paymentPlan.push({ description: desc, value: val, status: status });
            }
        });

        var payload = {
            customerName: document.getElementById('customer-name').value.trim(),
            email: document.getElementById('customer-email').value.trim(),
            date: document.getElementById('statement-date').value,
            pilgrims: pilgrims,
            services: services,
            paymentPlan: paymentPlan,
            currency: currentCurrency,
            lang: currentLang
        };

        if (pdfBase64) {
            payload.pdfBase64 = pdfBase64;
            payload.pdfFilename = pdfFilename;
        }

        try {
            var response = await fetch('/.netlify/functions/send-statement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            var result = await response.json();

            if (response.ok && result.success) {
                showToast(t.successToast, 'success');
                resetForm();
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Statement submission error:', error);
            showToast(t.errorToast, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = t.submit;
        }
    }

    function resetForm() {
        document.getElementById('statement-form').reset();

        // Reset pilgrims to one empty row
        var pilgrimsContainer = document.getElementById('pilgrims-list');
        while (pilgrimsContainer.firstChild) pilgrimsContainer.removeChild(pilgrimsContainer.firstChild);
        addPilgrimRow();

        // Reset services to one empty row
        var servicesBody = document.getElementById('services-body');
        while (servicesBody.rows.length > 0) servicesBody.deleteRow(0);
        addServiceRow();

        // Reset payment plan to one empty row
        var paymentBody = document.getElementById('payment-plan-body');
        while (paymentBody.rows.length > 0) paymentBody.deleteRow(0);
        addPaymentRow();

        pdfBase64 = null;
        pdfFilename = null;
        document.getElementById('pdf-filename').textContent = '';

        // Re-fill today's date
        document.getElementById('statement-date').value = getTodayDate();

        recalcServicesTotal();
    }

    // ============================================
    // UTILITIES
    // ============================================

    function formatMoney(num) {
        var parts = num.toFixed(2).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }

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
        var dateInput = document.getElementById('statement-date');
        if (dateInput) dateInput.value = getTodayDate();

        // Language toggle
        document.querySelectorAll('.lang-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                switchLanguage(btn.dataset.lang);
            });
        });

        // Currency toggle
        document.querySelectorAll('.currency-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                switchCurrency(btn.dataset.currency);
            });
        });

        // Add pilgrim button
        var addPilgrimBtn = document.getElementById('add-pilgrim-btn');
        if (addPilgrimBtn) addPilgrimBtn.addEventListener('click', function() { addPilgrimRow(); });

        // Add service button
        var addServiceBtn = document.getElementById('add-service-btn');
        if (addServiceBtn) addServiceBtn.addEventListener('click', function() { addServiceRow(); });

        // Add payment button
        var addPaymentBtn = document.getElementById('add-payment-btn');
        if (addPaymentBtn) addPaymentBtn.addEventListener('click', function() { addPaymentRow(); });

        // Initialize with one row each
        addPilgrimRow();
        addServiceRow();
        addPaymentRow();

        // PDF input
        var pdfInput = document.getElementById('pdf-upload');
        if (pdfInput) pdfInput.addEventListener('change', handlePdfSelect);

        // Form submission
        var form = document.getElementById('statement-form');
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
