import {FormlyFieldConfig} from "@ngx-formly/core";

/**
 * Processes formly field configurations to add appropriate wrappers for fields using the "advanced" wrapper.
 * For custom field types (multiselect, chipsInput), adds "primeng-form-field" wrapper.
 * For standard field types, adds "form-field" wrapper.
 *
 * @param fields Array of formly field configurations to process
 */
export function processFieldWrappers(fields: FormlyFieldConfig[]): void {
    fields.forEach(field => {
        // Handle fieldGroup recursively
        if ((field as any).fieldGroup) {
            processFieldWrappers((field as any).fieldGroup);
        }

        // Handle fieldArray recursively
        if ((field as any).fieldArray && (field as any).fieldArray.fieldGroup) {
            processFieldWrappers((field as any).fieldArray.fieldGroup);
        }

        // Add appropriate wrappers for fields with advanced wrapper
        if (field.wrappers && field.wrappers.includes("advanced")) {
            const customTypes = ["multiselect", "chipsInput"];
            const fieldType = typeof field.type === "string" ? field.type : "";
            if (customTypes.includes(fieldType)) {
                if (!field.wrappers.includes("primeng-form-field")) {
                    field.wrappers.push("primeng-form-field");
                }
            } else {
                if (!field.wrappers.includes("form-field")) {
                    field.wrappers.push("form-field");
                }
            }
        }
    });
}