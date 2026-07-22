import { TriangleAlertIcon } from "lucide-react"
import { type ToastOptions, toast as hotToast } from "react-hot-toast"

type ToastMessage = Parameters<typeof hotToast>[0]

function warning(message: ToastMessage, options?: ToastOptions) {
    return hotToast(message, {
        ...options,
        icon: options?.icon ?? <TriangleAlertIcon className="size-4 text-amber-600 dark:text-amber-400" />,
    })
}

export const toast = {
    dismiss: hotToast.dismiss,
    error: hotToast.error,
    loading: hotToast.loading,
    success: hotToast.success,
    warning,
}
