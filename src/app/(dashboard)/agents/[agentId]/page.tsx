import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { getQueryClient, trpc } from "@/trpc/server";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { 
    AgentIdView, 
    AgentsIdViewError, 
    AgentsIdViewLoading 
} from "@/modules/agents/ui/views/agent-id-view";

interface Props {
    params: { agentId: string };
}

const Page = async ({ params }: Props) => {
    const { agentId } = params;

    const queryClient = getQueryClient();

    await queryClient.prefetchQuery(
        trpc.agents.getOne.queryOptions({ id: agentId })
    );

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <Suspense fallback={<AgentsIdViewLoading />}>
                <ErrorBoundary fallback={<AgentsIdViewError />}>
                    <AgentIdView agentId={agentId} />
                </ErrorBoundary>
            </Suspense>
        </HydrationBoundary>
    );
};

export default Page;