//COMMENT: §§§ SECTION 1: EXPERIENCE CONFIGURATION §§§

//COMMENT: [COLLECT EXPERIENCE CONTROLS]
const chapter_elements = Array.from(document.querySelectorAll("[data-chapter]"));
const experience_track_element = document.querySelector("[data-experience-track]");
const previous_button = document.querySelector("[data-prev-chapter]");
const next_link = document.querySelector("[data-next-chapter]");
const previous_title_element = document.querySelector("[data-prev-title]");
const next_title_element = document.querySelector("[data-next-title]");
const header_context_element = document.querySelector("[data-chapter-context]");
const nav_title_element = document.querySelector("[data-nav-title]");
const nav_count_element = document.querySelector("[data-nav-count]");
const chapter_link_elements = Array.from(document.querySelectorAll("[data-chapter-link]"));

if (
    !chapter_elements.length
    || !experience_track_element
    || !previous_button
    || !next_link
    || !previous_title_element
    || !next_title_element
) {
    throw new Error("Missing required Noble experience elements.");
}

let active_chapter_index = 0;


//COMMENT: [RESOLVE ACTIVE CHAPTER FROM THE URL]
function resolve_chapter_index_from_hash() {
    const requested_id = window.location.hash.replace("#", "");

    if (!requested_id) {
        return 0;
    }

    const matching_index = chapter_elements.findIndex(
        (chapter_element) => chapter_element.id === requested_id
    );

    return matching_index >= 0 ? matching_index : 0;
}


//COMMENT: [READ THE PUBLIC CHAPTER TITLE]
function chapter_title(chapter_element) {
    return chapter_element?.dataset.title || chapter_element?.id || "Explore Noble";
}


//COMMENT: [UPDATE EXPERIENCE ORIENTATION AND DESTINATION STATE]
function update_experience_ui() {
    const active_chapter = chapter_elements[active_chapter_index];
    const active_title = chapter_title(active_chapter);
    const previous_chapter = chapter_elements[active_chapter_index - 1];
    const next_chapter = chapter_elements[active_chapter_index + 1];

    document.body.dataset.activeChapter = active_chapter.id;
    header_context_element.textContent = active_title;
    nav_title_element.textContent = active_title;
    nav_count_element.textContent = (
        `${String(active_chapter_index + 1).padStart(2, "0")} / ${String(chapter_elements.length).padStart(2, "0")}`
    );

    previous_button.disabled = !previous_chapter;
    previous_title_element.textContent = previous_chapter
        ? chapter_title(previous_chapter)
        : active_title;
    previous_button.setAttribute(
        "aria-label",
        previous_chapter
            ? `Go to ${chapter_title(previous_chapter)}`
            : "No previous Explore destination"
    );

    if (next_chapter) {
        next_link.href = `#${next_chapter.id}`;
        next_title_element.textContent = chapter_title(next_chapter);
        next_link.setAttribute("aria-label", `Go to ${chapter_title(next_chapter)}`);
    } else {
        next_link.href = "../contact/index.html";
        next_title_element.textContent = "Start a Conversation";
        next_link.setAttribute("aria-label", "Start a Conversation with Noble");
    }

    chapter_elements.forEach((chapter_element, chapter_index) => {
        const is_active = chapter_index === active_chapter_index;

        chapter_element.setAttribute("aria-hidden", String(!is_active));
        chapter_element.toggleAttribute("inert", !is_active);
    });

    chapter_link_elements.forEach((link_element) => {
        const target_id = link_element.getAttribute("href")?.replace("#", "");

        if (target_id === active_chapter.id) {
            link_element.setAttribute("aria-current", "step");
        } else {
            link_element.removeAttribute("aria-current");
        }
    });
}


//COMMENT: [MOVE THE EXPERIENCE TO ONE CHAPTER]
function show_chapter(chapter_index, options = {}) {
    const bounded_index = Math.max(
        0,
        Math.min(chapter_elements.length - 1, chapter_index)
    );

    active_chapter_index = bounded_index;
    const active_chapter = chapter_elements[active_chapter_index];

    experience_track_element.style.transform = (
        `translate3d(-${active_chapter_index * 100}vw, 0, 0)`
    );

    if (options.reset_scroll !== false) {
        active_chapter.scrollTop = 0;
    }

    if (options.update_hash !== false) {
        history.replaceState(null, "", `#${active_chapter.id}`);
    }

    update_experience_ui();
}

previous_button.addEventListener("click", () => {
    show_chapter(active_chapter_index - 1);
});

next_link.addEventListener("click", (event) => {
    const next_chapter = chapter_elements[active_chapter_index + 1];

    if (!next_chapter) {
        return;
    }

    event.preventDefault();
    show_chapter(active_chapter_index + 1);
});

chapter_link_elements.forEach((link_element) => {
    link_element.addEventListener("click", (event) => {
        const target_id = link_element.getAttribute("href")?.replace("#", "");
        const target_index = chapter_elements.findIndex(
            (chapter_element) => chapter_element.id === target_id
        );

        if (target_index < 0) {
            return;
        }

        event.preventDefault();
        show_chapter(target_index);
        document.querySelector(
            '[data-menu][aria-hidden="false"] [data-menu-close]'
        )?.click();
    });
});


document.addEventListener("keydown", (event) => {
    if (document.body.classList.contains("has-open-menu")) {
        return;
    }

    if (
        event.target instanceof Element
        && event.target.closest("input, textarea, select, button, a")
    ) {
        return;
    }

    if (event.key === "ArrowLeft") {
        show_chapter(active_chapter_index - 1);
    }

    if (event.key === "ArrowRight") {
        show_chapter(active_chapter_index + 1);
    }
});


//COMMENT: §§§ SECTION 2: FOUR QUESTIONS SYSTEM §§§

//COMMENT: [KEEP ONE QUESTION OPEN WHEN THE VISITOR CHOOSES TO EXPAND IT]
const question_media_query = window.matchMedia("(max-width: 820px)");
const question_trigger_elements = Array.from(
    document.querySelectorAll("[data-question-trigger]")
);
const question_panel_elements = Array.from(
    document.querySelectorAll("[data-question-panel]")
);

function set_active_question(question_name) {
    question_trigger_elements.forEach((trigger_element) => {
        const is_active = trigger_element.dataset.questionTrigger === question_name;

        trigger_element.classList.toggle("is-active", is_active);
        trigger_element.setAttribute("aria-expanded", String(is_active));
    });

    question_panel_elements.forEach((panel_element) => {
        const is_active = panel_element.dataset.questionPanel === question_name;

        panel_element.classList.toggle("is-active", is_active);
        panel_element.setAttribute("aria-hidden", String(!is_active));
        panel_element.toggleAttribute("inert", !is_active);
    });
}

function close_all_questions() {
    question_trigger_elements.forEach((trigger_element) => {
        trigger_element.classList.remove("is-active");
        trigger_element.setAttribute("aria-expanded", "false");
    });

    question_panel_elements.forEach((panel_element) => {
        panel_element.classList.remove("is-active");
        panel_element.setAttribute("aria-hidden", "true");
        panel_element.setAttribute("inert", "");
    });
}

question_trigger_elements.forEach((trigger_element, trigger_index) => {
    trigger_element.addEventListener("click", () => {
        const question_name = trigger_element.dataset.questionTrigger;
        const is_open = trigger_element.getAttribute("aria-expanded") === "true";

        if (question_media_query.matches && is_open) {
            close_all_questions();
            return;
        }

        set_active_question(question_name);
    });

    trigger_element.addEventListener("keydown", (event) => {
        let next_index = null;

        if (["ArrowDown", "ArrowRight"].includes(event.key)) {
            next_index = (trigger_index + 1) % question_trigger_elements.length;
        } else if (["ArrowUp", "ArrowLeft"].includes(event.key)) {
            next_index = (
                trigger_index - 1 + question_trigger_elements.length
            ) % question_trigger_elements.length;
        } else if (event.key === "Home") {
            next_index = 0;
        } else if (event.key === "End") {
            next_index = question_trigger_elements.length - 1;
        }

        if (next_index === null) {
            return;
        }

        event.preventDefault();
        question_trigger_elements[next_index]?.focus();
    });
});

if (question_media_query.matches) {
    close_all_questions();
} else if (question_trigger_elements.length) {
    set_active_question(question_trigger_elements[0].dataset.questionTrigger);
}

question_media_query.addEventListener("change", (event) => {
    const has_active_question = question_trigger_elements.some(
        (trigger_element) => trigger_element.getAttribute("aria-expanded") === "true"
    );

    if (!event.matches && !has_active_question && question_trigger_elements.length) {
        set_active_question(question_trigger_elements[0].dataset.questionTrigger);
    }
});


//COMMENT: §§§ SECTION 3: PROCESS STAGE SYSTEM §§§

//COMMENT: [KEEP ONE PROCESS STAGE OPEN AND LET THE SECTION RESIZE AROUND IT]
const process_stage_elements = Array.from(
    document.querySelectorAll("[data-process-stage]")
);
const process_trigger_elements = process_stage_elements
    .map((stage_element) => stage_element.querySelector(".process-stage__trigger"))
    .filter(Boolean);

function set_process_stage(active_stage_element, options = {}) {
    const { move_focus = false } = options;

    if (!active_stage_element) {
        return;
    }

    process_stage_elements.forEach((stage_element) => {
        const is_active = stage_element === active_stage_element;
        const trigger_element = stage_element.querySelector(".process-stage__trigger");
        const panel_element = stage_element.querySelector(".process-stage__panel");

        stage_element.classList.toggle("is-active", is_active);
        trigger_element?.setAttribute("aria-expanded", String(is_active));

        if (panel_element) {
            panel_element.setAttribute("aria-hidden", String(!is_active));
            panel_element.toggleAttribute("inert", !is_active);
        }
    });

    if (move_focus) {
        active_stage_element.querySelector(".process-stage__trigger")?.focus();
    }
}

process_stage_elements.forEach((stage_element, stage_index) => {
    const trigger_element = stage_element.querySelector(".process-stage__trigger");

    if (!trigger_element) {
        return;
    }

    trigger_element.addEventListener(
        "click",
        () => set_process_stage(stage_element)
    );

    trigger_element.addEventListener("keydown", (event) => {
        let next_index = null;

        if (["ArrowRight", "ArrowDown"].includes(event.key)) {
            next_index = (stage_index + 1) % process_trigger_elements.length;
        } else if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
            next_index = (
                stage_index - 1 + process_trigger_elements.length
            ) % process_trigger_elements.length;
        } else if (event.key === "Home") {
            next_index = 0;
        } else if (event.key === "End") {
            next_index = process_trigger_elements.length - 1;
        }

        if (next_index === null) {
            return;
        }

        event.preventDefault();
        process_trigger_elements[next_index]?.focus();
    });
});


//COMMENT: §§§ SECTION 4: VIEWPORT AND HASH CONTINUITY §§§

//COMMENT: [KEEP THE ACTIVE CHAPTER ALIGNED ACROSS RESIZE AND DIRECT LINKS]
function realign_active_chapter() {
    show_chapter(active_chapter_index, {
        reset_scroll: false,
        update_hash: false
    });
}

window.addEventListener("resize", realign_active_chapter);
window.addEventListener("hashchange", () => {
    show_chapter(
        resolve_chapter_index_from_hash(),
        { update_hash: false }
    );
});

experience_track_element.style.transition = "none";
show_chapter(
    resolve_chapter_index_from_hash(),
    { reset_scroll: false, update_hash: false }
);
requestAnimationFrame(() => {
    requestAnimationFrame(() => {
        experience_track_element.style.removeProperty("transition");
    });
});
