export type StatusType = 'normal' | 'busy' | 'closed' | 'warning' | 'error';

interface StatusBadgeProps {
    status: StatusType;
    label?: string; // Optional override text
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
    const getStyles = () => {
        switch (status) {
            case 'normal':
                return "bg-green-100 text-green-700 border-green-200";
            case 'busy':
            case 'error':
                return "bg-red-100 text-red-700 border-red-200";
            case 'warning':
                return "bg-yellow-100 text-yellow-700 border-yellow-200";
            case 'closed':
            default:
                return "bg-gray-100 text-gray-600 border-gray-200";
        }
    };

    const getDefaultLabel = () => {
        switch (status) {
            case 'normal': return '원활';
            case 'busy': return '혼잡';
            case 'warning': return '주의';
            case 'error': return '오류';
            case 'closed': return '종료';
            default: return status;
        }
    };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStyles()}`}>
            {label || getDefaultLabel()}
        </span>
    );
}
