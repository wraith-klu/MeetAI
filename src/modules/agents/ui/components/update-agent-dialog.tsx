import { ResponsiveDialog } from "@/components/responsive-dialog";
import { AgentForm } from "./agent-form";
import type { AgentGetOne } from "../../types";

interface NewAgentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialvalues: AgentGetOne;
}

export const UpdateAgentDialog = ({
    open,
    onOpenChange,
    initialvalues,
}: NewAgentDialogProps) => {
    return (
        <ResponsiveDialog
            title="Edit Agent"
            description="Edit the agent details"
            open={open}
            onOpenChange={onOpenChange}
        >
            <AgentForm 
                onSuccess={() => onOpenChange(false)}
                onCancel={() => onOpenChange(false)}
                initialValues={initialvalues}
            />
        </ResponsiveDialog>
    );
};