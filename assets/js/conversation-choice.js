//COMMENT: §§§ SECTION 1: CONVERSATION PATH ATTENTION §§§

//COMMENT: [COLLECT COMPLETE CONVERSATION PATHS]
const attention_path_elements = Array.from(
    document.querySelectorAll("[data-attention-path]")
);

const attention_delay_ms = 125;
const attention_exit_delay_ms = 80;
const attention_timers = new WeakMap();


//COMMENT: §§§ SECTION 2: ATTENTION STATE MANAGEMENT §§§

//COMMENT: [CLEAR A PENDING ATTENTION TIMER]
function clear_attention_timer(path_element) {
    const timer_id = attention_timers.get(path_element);

    if (!timer_id) {
        return;
    }

    window.clearTimeout(timer_id);
}


//COMMENT: [APPLY ATTENTION ONLY TO THE PATH THE VISITOR IS ENGAGING]
function set_path_attention(
    path_element,
    is_active,
    delay_ms
) {
    clear_attention_timer(path_element);

    const timer_id = window.setTimeout(() => {
        attention_path_elements.forEach((candidate_element) => {
            const should_receive_attention = (
                is_active
                && candidate_element === path_element
            );

            candidate_element.classList.toggle(
                "is-attended",
                should_receive_attention
            );
        });
    }, delay_ms);

    attention_timers.set(path_element, timer_id);
}


//COMMENT: §§§ SECTION 3: POINTER AND KEYBOARD BINDINGS §§§

//COMMENT: [BIND EQUIVALENT POINTER AND FOCUS STATES]
attention_path_elements.forEach((path_element) => {
    path_element.addEventListener("pointerenter", (event) => {
        if (event.pointerType === "touch") {
            return;
        }

        set_path_attention(
            path_element,
            true,
            attention_delay_ms
        );
    });

    path_element.addEventListener("pointerleave", () => {
        set_path_attention(
            path_element,
            false,
            attention_exit_delay_ms
        );
    });

    path_element.addEventListener("focus", () => {
        set_path_attention(path_element, true, 0);
    });

    path_element.addEventListener("blur", () => {
        set_path_attention(path_element, false, 0);
    });
});
