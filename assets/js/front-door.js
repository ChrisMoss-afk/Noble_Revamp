//COMMENT: §§§ SECTION 1: FOUR QUESTIONS CONTENT §§§

//COMMENT: [DEFINE OWNER-FACING RELEVANCE FOR EACH QUESTION]
const question_content = {
    direction: {
        label: "Direction",
        copy: "Where you want the business to go changes what needs attention now. Even when the destination is not fully decided, the possibilities you are considering help clarify what matters most and where to focus first."
    },
    value: {
        label: "Value",
        copy: "The value of your business is being shaped every day by the decisions you make, often before you can see the effect. Understanding what is strengthening the business, and what may be weakening it, helps you protect what is working, improve what is not, and make future decisions from a stronger position."
    },
    independence: {
        label: "Independence",
        copy: "The role you play in the business matters, but so does what happens when you are not there. Understanding where the business depends on you helps clarify what needs to become stronger, giving you more choice in the role you choose to play."
    },
    outcome: {
        label: "Outcome",
        copy: "On paper, a transition can look successful and still miss what matters to you. Knowing what you want to protect and what you want the transition to make possible gives you a clearer basis for the decisions that shape the outcome."
    }
};

const question_trigger_elements = Array.from(
    document.querySelectorAll("[data-question-trigger]")
);
const question_detail_element = document.querySelector("[data-question-detail]");
const question_detail_label_element = document.querySelector("[data-question-detail-label]");
const question_detail_copy_element = document.querySelector("[data-question-detail-copy]");

let active_question_key = null;


//COMMENT: §§§ SECTION 2: QUESTION STATE MANAGEMENT §§§

//COMMENT: [RETURN ALL QUESTIONS TO EQUAL STATUS]
function clear_active_question() {
    active_question_key = null;

    question_trigger_elements.forEach((trigger_element) => {
        trigger_element.classList.remove("is-active");
        trigger_element.setAttribute("aria-expanded", "false");
    });

    if (!question_detail_element) {
        return;
    }

    question_detail_element.hidden = true;
}


//COMMENT: [LOAD THE SELECTED QUESTION INTO THE SHARED DETAIL FIELD]
function show_question_detail(question_key) {
    const selected_content = question_content[question_key];

    if (
        !selected_content
        || !question_detail_element
        || !question_detail_label_element
        || !question_detail_copy_element
    ) {
        return;
    }

    active_question_key = question_key;

    question_trigger_elements.forEach((trigger_element) => {
        const is_selected = (
            trigger_element.dataset.questionTrigger === question_key
        );

        trigger_element.classList.toggle("is-active", is_selected);
        trigger_element.setAttribute(
            "aria-expanded",
            String(is_selected)
        );
    });

    question_detail_label_element.textContent = selected_content.label;
    question_detail_copy_element.textContent = selected_content.copy;
    question_detail_element.hidden = false;
}


//COMMENT: §§§ SECTION 3: QUESTION INTERACTIONS §§§

//COMMENT: [ALLOW EACH QUESTION TO OPEN OR CLOSE THE SHARED DETAIL FIELD]
question_trigger_elements.forEach((trigger_element) => {
    trigger_element.addEventListener("click", () => {
        const question_key = trigger_element.dataset.questionTrigger;

        if (active_question_key === question_key) {
            clear_active_question();
            return;
        }

        show_question_detail(question_key);
    });
});

//COMMENT: [ALLOW KEYBOARD USERS TO RETURN TO THE EQUAL-QUESTION STATE]
document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !active_question_key) {
        return;
    }

    clear_active_question();
});
