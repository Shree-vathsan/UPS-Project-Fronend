import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';

interface BackButtonProps {
    to?: string;
    label?: string;
}

export default function BackButton({ to, label = 'Back' }: BackButtonProps) {
    const navigate = useNavigate();
    const { resolvedTheme } = useTheme();

    const handleClick = () => {
        if (to) {
            navigate(to);
        } else {
            navigate(-1);
        }
    };

    return (
        <Button
            onClick={handleClick}
            variant="outline"
            className={`mb-6 gap-2 ${resolvedTheme === 'night' ? 'hover:bg-primary/40' : resolvedTheme === 'dark' ? 'hover:bg-blue-500/30' : resolvedTheme === 'light' ? 'hover:bg-blue-100 hover:text-blue-700' : ''}`}
        >
            <ArrowLeft className="h-4 w-4" />
            {label}
        </Button>
    );
}
