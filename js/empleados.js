(function () {
  var KEY = 'empleados_unlocked';

  var gate = document.getElementById('access-gate');
  var dashboard = document.getElementById('dashboard');
  var input = document.getElementById('access-code');
  var btn = document.getElementById('access-btn');
  var toast = document.getElementById('toast');

  function unlock() {
    gate.style.display = 'none';
    dashboard.classList.add('visible');
    sessionStorage.setItem(KEY, '1');
  }

  function showToast() {
    toast.classList.add('show');
    setTimeout(function () {
      toast.classList.remove('show');
    }, 2500);
  }

  function handleSubmit() {
    btn.disabled = true;
    fetch('/.netlify/functions/verify-employee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: input.value })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok) {
          unlock();
        } else {
          showToast();
          input.value = '';
          input.focus();
        }
      })
      .catch(function () {
        showToast();
      })
      .finally(function () {
        btn.disabled = false;
      });
  }

  // Auto-unlock if already authenticated in this session
  if (sessionStorage.getItem(KEY) === '1') {
    unlock();
  }

  btn.addEventListener('click', handleSubmit);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') handleSubmit();
  });
})();
