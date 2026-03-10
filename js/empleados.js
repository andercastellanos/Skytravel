(function () {
  var CODE = 'sky2026';
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
    if (input.value === CODE) {
      unlock();
    } else {
      showToast();
      input.value = '';
      input.focus();
    }
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
