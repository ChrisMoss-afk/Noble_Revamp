//COMMENT: §§§ SECTION 1: SHARED MENU CONFIGURATION §§§

//COMMENT: [COLLECT MENU CONTROLS]
const menu_open_buttons = Array.from(
    document.querySelectorAll("[data-menu-open]")
);
const menu_close_buttons = Array.from(
    document.querySelectorAll("[data-menu-close]")
);
const menu_elements = Array.from(
    document.querySelectorAll("[data-menu]")
);

//COMMENT: [DEFINE ACTIVE MENU STATE]
let active_menu_element = null;
let active_menu_trigger = null;
let inert_page_elements = [];


//COMMENT: §§§ SECTION 2: MENU STATE MANAGEMENT §§§

//COMMENT: [READ FOCUSABLE CONTROLS INSIDE THE ACTIVE MENU]
function menu_focusable_elements(menu_element) {
    return Array.from(
        menu_element.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
    ).filter((element) => !element.hasAttribute("inert"));
}


//COMMENT: [KEEP THE PAGE OUTSIDE AN OPEN MENU INACTIVE]
function set_page_inert(menu_element, is_inert) {
    if (is_inert) {
        inert_page_elements = Array.from(document.body.children).filter(
            (element) => (
                element !== menu_element
                && element.tagName !== "SCRIPT"
                && !element.hasAttribute("inert")
            )
        );

        inert_page_elements.forEach((element) => {
            element.setAttribute("inert", "");
        });
        return;
    }

    inert_page_elements.forEach((element) => {
        element.removeAttribute("inert");
    });
    inert_page_elements = [];
}


//COMMENT: [APPLY OPEN OR CLOSED MENU STATE]
function set_menu_state(
    menu_element,
    is_open,
    trigger_element = null
) {
    if (!menu_element) {
        return;
    }

    menu_element.setAttribute("aria-hidden", String(!is_open));
    menu_element.toggleAttribute("inert", !is_open);
    document.body.classList.toggle("has-open-menu", is_open);

    if (trigger_element) {
        trigger_element.setAttribute("aria-expanded", String(is_open));
    }

    if (is_open) {
        active_menu_element = menu_element;
        active_menu_trigger = trigger_element;
        set_page_inert(menu_element, true);

        const focusable_elements = menu_focusable_elements(menu_element);
        focusable_elements[0]?.focus();
        return;
    }

    set_page_inert(menu_element, false);
    active_menu_element = null;
    active_menu_trigger?.focus();
    active_menu_trigger = null;
}


//COMMENT: [KEEP KEYBOARD FOCUS INSIDE AN OPEN MENU]
function contain_menu_focus(event) {
    if (event.key !== "Tab" || !active_menu_element) {
        return;
    }

    const focusable_elements = menu_focusable_elements(active_menu_element);

    if (!focusable_elements.length) {
        event.preventDefault();
        return;
    }

    const first_element = focusable_elements[0];
    const last_element = focusable_elements[focusable_elements.length - 1];

    if (event.shiftKey && document.activeElement === first_element) {
        event.preventDefault();
        last_element.focus();
        return;
    }

    if (!event.shiftKey && document.activeElement === last_element) {
        event.preventDefault();
        first_element.focus();
    }
}


//COMMENT: §§§ SECTION 3: MENU EVENT BINDINGS §§§

//COMMENT: [BIND MENU OPEN CONTROLS]
menu_open_buttons.forEach((open_button) => {
    open_button.addEventListener("click", () => {
        const menu_id = open_button.getAttribute("aria-controls");
        const menu_element = (
            menu_id
                ? document.getElementById(menu_id)
                : null
        );

        set_menu_state(menu_element, true, open_button);
    });
});


//COMMENT: [BIND MENU CLOSE CONTROLS]
menu_close_buttons.forEach((close_button) => {
    close_button.addEventListener("click", () => {
        const menu_element = close_button.closest("[data-menu]");
        set_menu_state(menu_element, false, active_menu_trigger);
    });
});


//COMMENT: [BIND KEYBOARD MENU BEHAVIOR]
document.addEventListener("keydown", (event) => {
    contain_menu_focus(event);

    if (event.key !== "Escape" || !active_menu_element) {
        return;
    }

    set_menu_state(active_menu_element, false, active_menu_trigger);
});


//COMMENT: §§§ SECTION 4: INITIALIZATION §§§

//COMMENT: [KEEP CLOSED MENUS OUT OF THE TAB ORDER]
menu_elements.forEach((menu_element) => {
    if (menu_element.getAttribute("aria-hidden") === "true") {
        menu_element.setAttribute("inert", "");
    }
});
