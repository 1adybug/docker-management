import { FormEvent } from "react"

interface Form {
    handleSubmit(): void
}

export function getOnSubmit(form: Form) {
    return function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        form.handleSubmit()
    }
}
