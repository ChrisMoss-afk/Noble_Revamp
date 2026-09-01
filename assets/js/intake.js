//COMMENT: §§§ SECTION 1: CONFIGURATION §§§

//COMMENT: [DEFINE INTAKE PARAMETERS]
const near_term_timeline_values = new Set([
    "Within 3 months",
    "3–6 months",
    "6–12 months"
]);

const direct_sale_direction = "Sell to a third party";
const urgent_change_trigger = (
    "Something has changed and I need to make decisions sooner than expected."
);
const engagement_brief_storage_key = "noble_last_engagement_brief";

//COMMENT: [DEFINE HUMAN CONVERSATION PHASES]
const intake_phase_definitions = [
    { label: "Why now", stage_indexes: [0] },
    { label: "Your business", stage_indexes: [1] },
    { label: "What comes next", stage_indexes: [2, 3, 4, 5] },
    { label: "Readiness", stage_indexes: [6, 7] },
    { label: "About you", stage_indexes: [8, 9] }
];

//COMMENT: [DEFINE EDITABLE STAGES WITHIN EACH REVIEW PHASE]
const review_edit_stage_indexes = [
    [0],
    [1],
    [2, 3, 4, 5],
    [6, 7],
    [8]
];


//COMMENT: §§§ SECTION 2: DOM REFERENCES §§§

//COMMENT: [COLLECT INTAKE ELEMENTS]
const intake_form_element = document.querySelector("#engagement-intake");
const intake_stage_elements = Array.from(
    document.querySelectorAll("[data-intake-stage]")
);
const intake_back_button = document.querySelector("[data-intake-back]");
const intake_next_button = document.querySelector("[data-intake-next]");
const intake_actions_element = document.querySelector("[data-intake-actions]");
const intake_count_element = document.querySelector("[data-intake-count]");
const intake_label_element = document.querySelector("[data-intake-label]");
const intake_header_phase_element = document.querySelector("[data-intake-header-phase]");
const form_error_element = document.querySelector("[data-form-error]");
const intake_review_element = document.querySelector("[data-intake-review]");
const review_cancel_button = document.querySelector("[data-review-cancel]");
const phone_input_element = document.querySelector("#phone");
const review_confirmation_element = document.querySelector("#review_confirm");

const near_term_panel = document.querySelector("[data-near-term-panel]");
const intake_phase_elements = Array.from(
    document.querySelectorAll("[data-phase]")
);


//COMMENT: §§§ SECTION 3: VALIDATION §§§

//COMMENT: [VALIDATE REQUIRED INTAKE STRUCTURE]
const missing_intake_elements = [];

if (!intake_form_element) {
    missing_intake_elements.push("intake form");
}

if (!intake_stage_elements.length) {
    missing_intake_elements.push("intake stages");
}

if (!intake_back_button || !intake_next_button || !review_cancel_button) {
    missing_intake_elements.push("intake navigation controls");
}

if (!intake_review_element || !review_confirmation_element) {
    missing_intake_elements.push("intake review / confirmation area");
}

if (missing_intake_elements.length) {
    throw new Error(
        `Missing required Noble intake elements: ${missing_intake_elements.join(", ")}`
    );
}


//COMMENT: §§§ SECTION 4: INTAKE STATE §§§

//COMMENT: [DEFINE WORKING INTAKE STATE]
let active_stage_index = 0;
let intake_response_data = {};
let current_advisor_brief = "";
let review_edit_phase_index = null;
let review_edit_snapshot = null;


//COMMENT: [READ SINGLE FORM VALUE]
function get_single_value(field_name) {
    const selected_field = intake_form_element.querySelector(
        `[name="${field_name}"]:checked`
    );

    if (selected_field) {
        return selected_field.value;
    }

    const field_element = intake_form_element.elements.namedItem(field_name);

    if (!field_element || field_element instanceof RadioNodeList) {
        return "";
    }

    return String(field_element.value || "").trim();
}


//COMMENT: [READ MULTIPLE FORM VALUES]
function get_multiple_values(field_name) {
    return Array.from(
        intake_form_element.querySelectorAll(
            `[name="${field_name}"]:checked`
        )
    ).map((field_element) => field_element.value);
}


//COMMENT: [CAPTURE CANONICAL FORM RESPONSES]
function capture_intake_responses() {
    const response_data = {};
    const form_data = new FormData(intake_form_element);

    for (const [field_name, field_value] of form_data.entries()) {
        if (field_name in response_data) {
            if (!Array.isArray(response_data[field_name])) {
                response_data[field_name] = [response_data[field_name]];
            }

            response_data[field_name].push(field_value);
            continue;
        }

        response_data[field_name] = field_value;
    }

    const multi_value_fields = [
        "dependency_areas",
        "transition_priorities",
        "decision_participants"
    ];

    multi_value_fields.forEach((field_name) => {
        response_data[field_name] = get_multiple_values(field_name);
    });

    intake_response_data = response_data;

    return response_data;
}


//COMMENT: [CAPTURE FORM CONTROL STATE FOR REVIEW EDITING]
function capture_form_state() {
    return Array.from(intake_form_element.elements)
        .filter((field_element) => field_element.name)
        .map((field_element) => ({
            id: field_element.id,
            name: field_element.name,
            type: field_element.type,
            value: field_element.value,
            checked: Boolean(field_element.checked)
        }));
}


//COMMENT: [RESTORE FORM CONTROL STATE AFTER CANCELLED REVIEW EDITING]
function restore_form_state(form_state) {
    if (!Array.isArray(form_state)) {
        return;
    }

    form_state.forEach((field_state) => {
        const field_element = field_state.id
            ? document.getElementById(field_state.id)
            : null;

        if (!field_element) {
            return;
        }

        if (["checkbox", "radio"].includes(field_state.type)) {
            field_element.checked = field_state.checked;
            return;
        }

        field_element.value = field_state.value;
    });

    update_near_term_panel();
}


//COMMENT: [FORMAT NORTH AMERICAN PHONE NUMBERS AS (XXX) XXX.XXXX]
function format_phone_number(input_value) {
    let digits = String(input_value || "").replace(/\D/g, "");

    if (digits.length === 11 && digits.startsWith("1")) {
        digits = digits.slice(1);
    }

    digits = digits.slice(0, 10);

    if (!digits.length) {
        return "";
    }

    if (digits.length < 4) {
        return `(${digits}`;
    }

    if (digits.length < 7) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    }

    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}.${digits.slice(6)}`;
}


//COMMENT: §§§ SECTION 5: CONDITIONAL LOGIC §§§



//COMMENT: [UPDATE NEAR-TERM READINESS FOLLOW-UP]
function update_near_term_panel() {
    const transition_timeline = get_single_value("transition_timeline");
    const transition_direction = get_single_value("transition_direction");
    const trigger_reason = get_single_value("trigger_reason");

    const show_near_term_panel = (
        near_term_timeline_values.has(transition_timeline)
        || transition_direction === direct_sale_direction
        || trigger_reason === "I'm considering a sale within the next few years."
        || trigger_reason === urgent_change_trigger
    );

    near_term_panel?.classList.toggle(
        "is-visible",
        show_near_term_panel
    );

    const conditional_required_fields = [
        "buyer_discussions",
        "ma_advisor",
        "professional_team"
    ];

    conditional_required_fields.forEach((field_name) => {
        const field_element = intake_form_element.elements.namedItem(field_name);

        if (!field_element || field_element instanceof RadioNodeList) {
            return;
        }

        field_element.required = show_near_term_panel;

        if (!show_near_term_panel) {
            field_element.removeAttribute("aria-invalid");
        }
    });
}


//COMMENT: [ENFORCE EXCLUSIVE CHECKBOX OPTIONS]
function enforce_exclusive_checkbox(
    exclusive_checkbox_id,
    group_name
) {
    const exclusive_checkbox = document.querySelector(
        `#${exclusive_checkbox_id}`
    );

    if (!exclusive_checkbox) {
        return;
    }

    exclusive_checkbox.addEventListener("change", () => {
        if (!exclusive_checkbox.checked) {
            return;
        }

        intake_form_element.querySelectorAll(
            `[name="${group_name}"]`
        ).forEach((checkbox_element) => {
            if (checkbox_element !== exclusive_checkbox) {
                checkbox_element.checked = false;
            }
        });
    });

    intake_form_element.querySelectorAll(
        `[name="${group_name}"]`
    ).forEach((checkbox_element) => {
        if (checkbox_element === exclusive_checkbox) {
            return;
        }

        checkbox_element.addEventListener("change", () => {
            if (checkbox_element.checked) {
                exclusive_checkbox.checked = false;
            }
        });
    });
}


//COMMENT: §§§ SECTION 6: STAGE VALIDATION §§§

//COMMENT: [CLEAR FIELD VALIDATION STATE]
function clear_stage_validation(stage_element) {
    stage_element.querySelectorAll("[aria-invalid='true']").forEach(
        (field_element) => field_element.removeAttribute("aria-invalid")
    );

    form_error_element.textContent = "";
}


//COMMENT: [VALIDATE REQUIRED CHOICE GROUP]
function validate_choice_group(group_element) {
    const group_name = group_element.dataset.requiredGroup;

    if (!group_name) {
        return true;
    }

    const checked_fields = group_element.querySelectorAll(
        `[name="${group_name}"]:checked`
    );

    if (checked_fields.length) {
        return true;
    }

    const first_field = group_element.querySelector(
        `[name="${group_name}"]`
    );

    first_field?.setAttribute("aria-invalid", "true");

    return false;
}


//COMMENT: [VALIDATE ACTIVE STAGE]
function validate_active_stage() {
    const stage_element = intake_stage_elements[active_stage_index];
    const invalid_fields = [];

    clear_stage_validation(stage_element);

    stage_element.querySelectorAll("[data-required-group]").forEach(
        (group_element) => {
            if (!validate_choice_group(group_element)) {
                invalid_fields.push(
                    group_element.querySelector("input")
                );
            }
        }
    );

    stage_element.querySelectorAll(
        "input[required], select[required], textarea[required]"
    ).forEach((field_element) => {
        if (field_element.type === "radio") {
            return;
        }

        if (field_element.type === "checkbox") {
            if (!field_element.checked) {
                field_element.setAttribute("aria-invalid", "true");
                invalid_fields.push(field_element);
            }
            return;
        }

        if (!field_element.value.trim()) {
            field_element.setAttribute("aria-invalid", "true");
            invalid_fields.push(field_element);
            return;
        }

        if (!field_element.checkValidity()) {
            field_element.setAttribute("aria-invalid", "true");
            invalid_fields.push(field_element);
        }
    });

    const first_invalid_field = invalid_fields.find(Boolean);

    if (first_invalid_field) {
        form_error_element.textContent = (
            "Please complete the required information before continuing."
        );
        first_invalid_field.focus();
        return false;
    }

    return true;
}


//COMMENT: §§§ SECTION 7: STAGE NAVIGATION §§§

//COMMENT: [UPDATE ACTIVE STAGE PRESENTATION]
function update_stage_presentation(stage_index) {
    active_stage_index = Math.max(
        0,
        Math.min(intake_stage_elements.length - 1, stage_index)
    );

    intake_stage_elements.forEach((stage_element, current_index) => {
        const is_active_stage = current_index === active_stage_index;

        stage_element.classList.toggle("is-active", is_active_stage);
        stage_element.hidden = !is_active_stage;
    });

    document.body.classList.toggle(
        "is-intake-active",
        active_stage_index > 0
    );

    const active_stage_element = intake_stage_elements[active_stage_index];
    const active_phase_index = intake_phase_definitions.findIndex(
        (phase_definition) => phase_definition.stage_indexes.includes(active_stage_index)
    );
    const normalized_phase_index = Math.max(0, active_phase_index);
    const active_phase = intake_phase_definitions[normalized_phase_index];
    const progress_percentage = (
        ((normalized_phase_index + 1) / intake_phase_definitions.length) * 100
    );
    const is_review_editing = review_edit_phase_index !== null;
    const edited_phase_stage_indexes = is_review_editing
        ? review_edit_stage_indexes[review_edit_phase_index]
        : [];
    const is_last_edited_stage = (
        is_review_editing
        && active_stage_index === edited_phase_stage_indexes.at(-1)
    );

    intake_count_element.textContent = (
        `Conversation phase ${normalized_phase_index + 1} of ${intake_phase_definitions.length}`
    );
    intake_label_element.textContent = active_phase.label;

    if (intake_header_phase_element) {
        intake_header_phase_element.textContent = active_phase.label.toUpperCase();
    }

    intake_phase_elements.forEach((phase_element, phase_index) => {
        phase_element.classList.toggle(
            "is-current",
            phase_index === normalized_phase_index
        );
        phase_element.classList.toggle(
            "is-complete",
            phase_index < normalized_phase_index
        );
    });

    document.documentElement.style.setProperty(
        "--intake-progress",
        `${progress_percentage}%`
    );

    intake_actions_element.classList.toggle(
        "is-review-editing",
        is_review_editing
    );

    if (is_review_editing) {
        intake_back_button.disabled = (
            active_stage_index === edited_phase_stage_indexes[0]
        );
        review_cancel_button.hidden = false;
        intake_next_button.textContent = is_last_edited_stage
            ? "Save and return to review →"
            : "Continue →";
    } else {
        intake_back_button.disabled = active_stage_index === 0;
        review_cancel_button.hidden = true;
        intake_next_button.textContent = (
            active_stage_index === intake_stage_elements.length - 1
                ? "Send to Noble →"
                : "Continue →"
        );
    }

    form_error_element.textContent = "";

    if (active_stage_index === intake_stage_elements.length - 1) {
        capture_intake_responses();
        render_review();
        review_confirmation_element.checked = false;
        review_confirmation_element.removeAttribute("aria-invalid");
    }

    const first_focusable = active_stage_element.querySelector(
        "input:not([type='hidden']), select, textarea, button"
    );

    first_focusable?.focus({ preventScroll: true });

    window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth"
    });
}


//COMMENT: [MOVE TO NEXT STAGE]
function move_to_next_stage() {
    update_near_term_panel();

    if (!validate_active_stage()) {
        return;
    }

    capture_intake_responses();

    if (review_edit_phase_index !== null) {
        const edited_stage_indexes = review_edit_stage_indexes[review_edit_phase_index];
        const last_edited_stage = edited_stage_indexes.at(-1);

        if (active_stage_index === last_edited_stage) {
            const edited_phase_index = review_edit_phase_index;

            review_edit_phase_index = null;
            review_edit_snapshot = null;
            update_stage_presentation(intake_stage_elements.length - 1);
            focus_review_phase(edited_phase_index);
            return;
        }

        update_stage_presentation(active_stage_index + 1);
        return;
    }

    if (active_stage_index === intake_stage_elements.length - 1) {
        complete_intake();
        return;
    }

    update_stage_presentation(active_stage_index + 1);
}


//COMMENT: [MOVE TO PREVIOUS STAGE]
function move_to_previous_stage() {
    if (active_stage_index === 0) {
        return;
    }

    if (review_edit_phase_index !== null) {
        const edited_stage_indexes = review_edit_stage_indexes[review_edit_phase_index];
        const first_edited_stage = edited_stage_indexes[0];

        if (active_stage_index <= first_edited_stage) {
            return;
        }
    }

    capture_intake_responses();
    update_stage_presentation(active_stage_index - 1);
}


//COMMENT: [CANCEL REVIEW EDITING AND RESTORE SAVED RESPONSES]
function cancel_review_edit() {
    if (review_edit_phase_index === null) {
        return;
    }

    const edited_phase_index = review_edit_phase_index;

    restore_form_state(review_edit_snapshot);
    review_edit_phase_index = null;
    review_edit_snapshot = null;
    update_stage_presentation(intake_stage_elements.length - 1);
    focus_review_phase(edited_phase_index);
}


//COMMENT: §§§ SECTION 8: REVIEW PRESENTATION §§§

//COMMENT: [NORMALIZE REVIEW VALUE]
function normalize_review_value(item_value) {
    if (Array.isArray(item_value)) {
        return item_value.join(", ");
    }

    return item_value || "";
}


//COMMENT: [CREATE REVIEW ITEM]
function create_review_item(item_label, item_value, is_wide = false) {
    const normalized_value = normalize_review_value(item_value);

    if (!normalized_value) {
        return null;
    }

    const review_item = document.createElement("div");
    const label_element = document.createElement("div");
    const value_element = document.createElement("div");

    review_item.className = "review-item";
    review_item.classList.toggle("review-item--wide", is_wide);
    review_item.classList.toggle("review-item--unlabelled", !item_label);
    label_element.className = "review-item__label";
    value_element.className = "review-item__value";

    label_element.textContent = item_label || "";
    value_element.textContent = normalized_value;

    if (item_label) {
        review_item.append(label_element);
    }

    review_item.append(value_element);

    return review_item;
}


//COMMENT: [CREATE REVIEW GROUP]
function create_review_group(group_title, review_items) {
    const group_element = document.createElement("div");
    const grid_element = document.createElement("div");

    group_element.className = "review-group";
    grid_element.className = "review-grid";

    if (group_title) {
        const title_element = document.createElement("h4");

        title_element.className = "review-group__title";
        title_element.textContent = group_title;
        group_element.append(title_element);
    }

    review_items.forEach(([item_label, item_value, is_wide]) => {
        const review_item = create_review_item(
            item_label,
            item_value,
            Boolean(is_wide)
        );

        if (review_item) {
            grid_element.append(review_item);
        }
    });

    if (!grid_element.children.length) {
        return null;
    }

    group_element.append(grid_element);

    return group_element;
}


//COMMENT: [CREATE REVIEW SECTION]
function create_review_section(
    section_title,
    phase_index,
    review_groups
) {
    const section_element = document.createElement("section");
    const header_element = document.createElement("div");
    const title_element = document.createElement("h3");
    const edit_button = document.createElement("button");
    const groups_element = document.createElement("div");

    section_element.className = "review-section";
    section_element.dataset.reviewPhase = String(phase_index);
    header_element.className = "review-section__header";
    title_element.className = "review-section__title";
    edit_button.className = "review-section__edit";
    edit_button.type = "button";
    edit_button.dataset.reviewEditPhase = String(phase_index);
    groups_element.className = "review-section__groups";

    title_element.textContent = section_title;
    edit_button.textContent = "Edit";
    edit_button.setAttribute(
        "aria-label",
        `Edit ${section_title} responses`
    );

    review_groups.forEach(({ title, items }) => {
        const review_group = create_review_group(title, items);

        if (review_group) {
            groups_element.append(review_group);
        }
    });

    header_element.append(title_element, edit_button);
    section_element.append(header_element, groups_element);

    return section_element;
}


//COMMENT: [RENDER VISITOR REVIEW]
function render_review() {
    const response_data = capture_intake_responses();

    intake_review_element.replaceChildren(
        create_review_section("Why Now", 0, [
            {
                title: null,
                items: [
                    ["Why now", response_data.trigger_reason, true]
                ]
            }
        ]),
        create_review_section("Your Business", 1, [
            {
                title: null,
                items: [
                    ["Industry", response_data.industry],
                    ["Location", response_data.location],
                    ["Revenue", response_data.revenue_range],
                    ["Employees", response_data.employee_range],
                    ["Owners", response_data.owner_count],
                    ["Years operating", response_data.years_operating],
                    ["Ownership role", response_data.ownership_role, true]
                ]
            }
        ]),
        create_review_section("What Comes Next", 2, [
            {
                title: "Direction",
                items: [
                    [null, response_data.transition_direction, true]
                ]
            },
            {
                title: "Value",
                items: [
                    ["Value clarity", response_data.value_confidence],
                    ["Valuation / readiness review", response_data.valuation_status],
                    ["Earnings trend", response_data.earnings_trend],
                    ["Customer concentration", response_data.customer_concentration]
                ]
            },
            {
                title: "Independence",
                items: [
                    ["90-day independence", response_data.owner_independence, true],
                    ["Owner dependency", response_data.dependency_areas, true]
                ]
            },
            {
                title: "Outcome",
                items: [
                    ["Timeline", response_data.transition_timeline],
                    ["What matters", response_data.transition_priorities, true],
                    ["Near-term context", response_data.near_term_trigger, true],
                    ["Buyer / investor discussions", response_data.buyer_discussions],
                    ["M&A advisor", response_data.ma_advisor],
                    ["Legal / accounting team", response_data.professional_team, true]
                ]
            }
        ]),
        create_review_section("Readiness", 3, [
            {
                title: null,
                items: [
                    ["People involved", response_data.decision_participants, true],
                    ["Alignment", response_data.alignment_status, true],
                    ["Desired clarity", response_data.clarity_goal, true],
                    ["Additional context", response_data.additional_context, true]
                ]
            }
        ]),
        create_review_section("About You", 4, [
            {
                title: null,
                items: [
                    ["Name", response_data.contact_name],
                    ["Business name", response_data.company_name],
                    ["Email", response_data.email],
                    ["Phone", response_data.phone],
                    ["Contact preference", response_data.contact_preference],
                    ["Best time", response_data.contact_window, true]
                ]
            }
        ])
    );
}


//COMMENT: [BEGIN REVIEW EDITING FOR A CONVERSATION PHASE]
function begin_review_edit(phase_index) {
    const editable_stage_indexes = review_edit_stage_indexes[phase_index];

    if (!editable_stage_indexes) {
        return;
    }

    review_edit_snapshot = capture_form_state();
    review_edit_phase_index = phase_index;
    update_stage_presentation(editable_stage_indexes[0]);
}


//COMMENT: [RETURN FOCUS TO THE REVIEWED CONVERSATION PHASE]
function focus_review_phase(phase_index) {
    window.requestAnimationFrame(() => {
        const edit_button = intake_review_element.querySelector(
            `[data-review-edit-phase="${phase_index}"]`
        );

        if (!edit_button) {
            return;
        }

        edit_button.focus({ preventScroll: true });
        edit_button.scrollIntoView({
            block: "center",
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "auto"
                : "smooth"
        });
    });
}


//COMMENT: §§§ SECTION 9: INTERNAL ASSESSMENT §§§

//COMMENT: [CLASSIFY PROSPECT FIT]
function classify_fit(response_data) {
    const strong_revenue_ranges = new Set([
        "$2M–$3M",
        "$3M–$5M",
        "$5M–$7M"
    ]);
    const western_locations = new Set([
        "Alberta",
        "British Columbia",
        "Saskatchewan",
        "Manitoba"
    ]);

    if (
        strong_revenue_ranges.has(response_data.revenue_range)
        && western_locations.has(response_data.location)
    ) {
        return "Strong fit";
    }

    return "Potential fit — review context";
}


//COMMENT: [CLASSIFY TRANSITION URGENCY]
function classify_urgency(response_data) {
    const timeline_value = response_data.transition_timeline;

    if (["Within 3 months", "3–6 months"].includes(timeline_value)) {
        return "High / immediate";
    }

    if (timeline_value === "6–12 months") {
        return "Near-term";
    }

    if (timeline_value === "1–2 years") {
        return "Medium horizon";
    }

    if (timeline_value === "No defined timeline yet") {
        return "Exploratory — no defined clock";
    }

    return "Longer-horizon preparation";
}


//COMMENT: [CLASSIFY OWNER DEPENDENCY]
function classify_dependency(response_data) {
    const independence_value = response_data.owner_independence;

    if (
        independence_value === "The business is heavily dependent on my involvement."
        || independence_value === "Several areas would struggle without me."
    ) {
        return "High";
    }

    if (
        independence_value
        === "Leadership could run it, but I would still be needed for important decisions."
    ) {
        return "Moderate";
    }

    if (independence_value === "The business would operate normally.") {
        return "Low";
    }

    return "Unclear";
}


//COMMENT: [CLASSIFY TRANSITION CLARITY]
function classify_transition_clarity(response_data) {
    if (
        response_data.transition_direction === "I genuinely don't know yet"
        && response_data.transition_timeline === "No defined timeline yet"
    ) {
        return "Exploratory";
    }

    if (
        response_data.transition_direction === "Explore several possibilities"
        || response_data.transition_timeline === "No defined timeline yet"
    ) {
        return "Developing";
    }

    return "Defined enough to frame a pathway";
}


//COMMENT: [IDENTIFY LIKELY NOBLE PATHWAY]
function identify_likely_pathway(response_data) {
    const dependency_classification = classify_dependency(response_data);

    if (
        near_term_timeline_values.has(response_data.transition_timeline)
        && response_data.transition_direction === direct_sale_direction
    ) {
        return "Business Transition Program + near-term transition coordination review";
    }

    if (dependency_classification === "High") {
        return "Business Transition Program with owner-independence emphasis";
    }

    if (response_data.transition_timeline === "3–5 years") {
        return "Business Transition Program with value / readiness roadmap";
    }

    return "Business Transition Program — confirm scope in first conversation";
}


//COMMENT: [BUILD CONVERSATION PRIORITIES]
function build_conversation_priorities(response_data) {
    const priorities = [];
    const dependency_areas = response_data.dependency_areas || [];

    if (classify_dependency(response_data) === "High") {
        priorities.push(
            `Explore owner dependency, especially: ${dependency_areas.join(", ") || "areas not yet isolated"}.`
        );
    }

    if (["Limited confidence", "No current view"].includes(response_data.value_confidence)) {
        priorities.push(
            "Establish the owner's current understanding of value and what evidence supports it."
        );
    }

    if (near_term_timeline_values.has(response_data.transition_timeline)) {
        priorities.push(
            "Clarify the near-term timing, active transaction activity, and which external advisors are already involved."
        );
    }

    if (response_data.alignment_status && response_data.alignment_status !== "Generally aligned") {
        priorities.push(
            `Understand the decision environment: ${response_data.alignment_status}.`
        );
    }

    if (response_data.clarity_goal) {
        priorities.push(
            `Start with the owner's stated objective: ${response_data.clarity_goal}`
        );
    }

    if (!priorities.length) {
        priorities.push(
            "Confirm the owner's desired outcome, timing, and the highest-value readiness question to address first."
        );
    }

    return priorities.slice(0, 5);
}


//COMMENT: §§§ SECTION 11: ADVISOR BRIEF §§§

//COMMENT: [FORMAT LIST VALUE]
function format_list_value(value) {
    if (!value) {
        return "Not provided";
    }

    if (Array.isArray(value)) {
        return value.length ? value.join(", ") : "Not provided";
    }

    return value;
}


//COMMENT: [BUILD ADVISOR-FACING ENGAGEMENT BRIEF]
function build_advisor_brief(response_data) {
    const fit_classification = classify_fit(response_data);
    const urgency_classification = classify_urgency(response_data);
    const dependency_classification = classify_dependency(response_data);
    const clarity_classification = classify_transition_clarity(response_data);
    const likely_pathway = identify_likely_pathway(response_data);
    const conversation_priorities = build_conversation_priorities(response_data);

    const brief_lines = [
        "NOBLE ADVISORY GROUP — ENGAGEMENT BRIEF",
        "========================================",
        "",
        `${format_list_value(response_data.contact_name)} — ${format_list_value(response_data.company_name)}`,
        "",
        "INTERNAL CLASSIFICATION",
        `Fit: ${fit_classification}`,
        `Urgency: ${urgency_classification}`,
        `Owner dependency: ${dependency_classification}`,
        `Transition clarity: ${clarity_classification}`,
        `Potential pathway: ${likely_pathway}`,
        "",
        "REASON FOR ENQUIRY",
        format_list_value(response_data.trigger_reason),
        "",
        "BUSINESS PROFILE",
        `Industry: ${format_list_value(response_data.industry)}`,
        `Location: ${format_list_value(response_data.location)}`,
        `Revenue: ${format_list_value(response_data.revenue_range)}`,
        `Employees: ${format_list_value(response_data.employee_range)}`,
        `Owners: ${format_list_value(response_data.owner_count)}`,
        `Years operating: ${format_list_value(response_data.years_operating)}`,
        `Ownership role: ${format_list_value(response_data.ownership_role)}`,
        "",
        "DIRECTION",
        format_list_value(response_data.transition_direction),
        "",
        "VALUE CLARITY",
        `Confidence: ${format_list_value(response_data.value_confidence)}`,
        `Valuation / readiness review: ${format_list_value(response_data.valuation_status)}`,
        `Earnings trend: ${format_list_value(response_data.earnings_trend)}`,
        `Customer concentration: ${format_list_value(response_data.customer_concentration)}`,
        "",
        "OWNER INDEPENDENCE",
        `90-day scenario: ${format_list_value(response_data.owner_independence)}`,
        `Dependency areas: ${format_list_value(response_data.dependency_areas)}`,
        "",
        "TRANSITION",
        `Timeline: ${format_list_value(response_data.transition_timeline)}`,
        `What must be protected: ${format_list_value(response_data.transition_priorities)}`,
        `Buyer / investor discussions: ${format_list_value(response_data.buyer_discussions)}`,
        `M&A advisor: ${format_list_value(response_data.ma_advisor)}`,
        `Legal / accounting team: ${format_list_value(response_data.professional_team)}`,
        `Near-term timing trigger: ${format_list_value(response_data.near_term_trigger)}`,
        "",
        "DECISION ENVIRONMENT",
        `People involved: ${format_list_value(response_data.decision_participants)}`,
        `Current alignment: ${format_list_value(response_data.alignment_status)}`,
        "",
        "OWNER'S STATED PRIORITY",
        format_list_value(response_data.clarity_goal),
        "",
        "ADDITIONAL CONTEXT",
        format_list_value(response_data.additional_context),
        "",
        "SUGGESTED OPENING CONVERSATION",
        ...conversation_priorities.map(
            (priority, index) => `${index + 1}. ${priority}`
        ),
        "",
        "CONTACT",
        `Email: ${format_list_value(response_data.email)}`,
        `Phone: ${format_list_value(response_data.phone)}`,
        `Preferred contact: ${format_list_value(response_data.contact_preference)}`,
        `Best time: ${format_list_value(response_data.contact_window)}`
    ];

    return brief_lines
        .filter((line, index, lines) => {
            if (line !== "") {
                return true;
            }

            return index === 0 || lines[index - 1] !== "";
        })
        .join("\n");
}


//COMMENT: §§§ SECTION 12: COMPLETION §§§

//COMMENT: [PREPARE THE COMPLETED INTAKE FOR THE DEDICATED CONFIRMATION PAGE]
function complete_intake() {
    const response_data = capture_intake_responses();
    const submitted_at = new Date().toISOString();

    current_advisor_brief = build_advisor_brief(response_data);

    const submission_record = {
        responses: response_data,
        advisor_brief: current_advisor_brief,
        submitted_at
    };

    //COMMENT: §§§ PRODUCTION INTEGRATION: NOBLE INTAKE SUBMISSION §§§
    //COMMENT: [STATIC PROTOTYPE HANDOFF POINT. NO NETWORK REQUEST IS MADE. THE COMPLETE SUBMISSION RECORD IS STORED ONLY IN THIS BROWSER UNTIL A SECURE PRODUCTION ENDPOINT IS APPROVED.]
    try {
        window.localStorage.setItem(
            engagement_brief_storage_key,
            JSON.stringify(submission_record)
        );
    } catch (storage_error) {
        console.warn(
            "The engagement brief could not be saved to browser storage.",
            storage_error
        );
    }

    window.location.assign("thank-you/index.html");
}


//COMMENT: §§§ SECTION 13: EVENT BINDING §§§

//COMMENT: [BIND FORM NAVIGATION]
intake_next_button.addEventListener("click", move_to_next_stage);
intake_back_button.addEventListener("click", move_to_previous_stage);
review_cancel_button.addEventListener("click", cancel_review_edit);


//COMMENT: [FORMAT PHONE NUMBER WHILE THE VISITOR TYPES]
phone_input_element?.addEventListener("input", () => {
    phone_input_element.value = format_phone_number(phone_input_element.value);
    phone_input_element.removeAttribute("aria-invalid");
});


//COMMENT: [BIND CONDITIONAL RESPONSE LOGIC]
intake_form_element.addEventListener("change", () => {
    update_near_term_panel();
});


//COMMENT: [BIND PHASE-LEVEL REVIEW EDITING]
intake_review_element.addEventListener("click", (event) => {
    const edit_button = event.target.closest("[data-review-edit-phase]");

    if (!edit_button) {
        return;
    }

    begin_review_edit(Number(edit_button.dataset.reviewEditPhase));
});


//COMMENT: [PREVENT NATIVE FORM SUBMISSION]
intake_form_element.addEventListener("submit", (event) => {
    event.preventDefault();
});


//COMMENT: [BIND EXCLUSIVE CHECKBOX GROUPS]
enforce_exclusive_checkbox("dependency-none", "dependency_areas");
enforce_exclusive_checkbox("participant-me", "decision_participants");


//COMMENT: §§§ SECTION 14: INITIALIZATION §§§

//COMMENT: [INITIALIZE CONDITIONAL PANELS]
update_near_term_panel();


//COMMENT: [INITIALIZE FIRST INTAKE STAGE]
update_stage_presentation(0);
