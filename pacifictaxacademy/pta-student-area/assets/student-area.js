/* Pacific Tax Academy student area: close the Help and account menus on outside click or Escape. */
(function () {
    var menus = document.querySelectorAll('.pta-sa-menu');
    if (!menus.length) {
        return;
    }
    document.addEventListener('click', function (e) {
        menus.forEach(function (menu) {
            if (menu.open && !menu.contains(e.target)) {
                menu.open = false;
            }
        });
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            menus.forEach(function (menu) {
                if (menu.open) {
                    menu.open = false;
                    menu.querySelector('summary').focus();
                }
            });
        }
    });
    menus.forEach(function (menu) {
        menu.addEventListener('toggle', function () {
            if (menu.open) {
                menus.forEach(function (other) {
                    if (other !== menu) {
                        other.open = false;
                    }
                });
            }
        });
    });
})();
