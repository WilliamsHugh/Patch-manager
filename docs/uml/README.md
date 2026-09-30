# UML diagrams for Patch Management System

These diagrams follow Chapter 2, Sections 2.2.1–2.2.4 and 2.2.6 of the course textbook, *Giáo trình phân tích và thiết kế hệ thống thông tin* (printed pages 24–39). They use actors and a system boundary, object states and guarded transitions, sequence lifelines/messages, activity swimlanes, and class associations with multiplicities.

| Editable source | Vector image | Word image | UML type | Main subject |
| --- | --- | --- | --- | --- |
| [01-use-cases.puml](01-use-cases.puml) | [SVG](01-use-cases.svg) | [PNG](01-use-cases.png) | Use case | Roles, current API capabilities, and target capabilities |
| [02-deployment-plan-state.puml](02-deployment-plan-state.puml) | [SVG](02-deployment-plan-state.svg) | [PNG](02-deployment-plan-state.png) | State machine | Lifecycle of one `DeploymentPlan` |
| [03-plan-review-deploy-sequence.puml](03-plan-review-deploy-sequence.puml) | [SVG](03-plan-review-deploy-sequence.svg) | [PNG](03-plan-review-deploy-sequence.png) | Sequence | Create, review, and deploy through the current API |
| [04-plan-workflow-activity.puml](04-plan-workflow-activity.puml) | [SVG](04-plan-workflow-activity.svg) | [PNG](04-plan-workflow-activity.png) | Activity | Operational decisions and responsibilities |
| [05-domain-class-diagram.puml](05-domain-class-diagram.puml) | [SVG](05-domain-class-diagram.svg) | [PNG](05-domain-class-diagram.png) | Class | Prisma entities, main attributes, associations, and service operations |

All labels are in English, consistent with the application. Each diagram has an editable PlantUML source plus SVG and PNG exports. The PNG files are convenient for Word; SVG keeps text sharp when enlarged. To regenerate the exports after installing PlantUML, run `plantuml -tsvg docs/uml/*.puml` and `plantuml -tpng docs/uml/*.puml` from the repository root.

## Implementation boundary

- Solid transitions in the state diagram represent current API operations. Dashed transitions and `<<planned>>` use cases are target behavior. The `PlanStatus` and `TaskStatus` enums contain states that do not yet have transitions or agent callbacks.
- The current create endpoint produces a `DRAFT` plan. There is no submit-for-approval endpoint. The seed contains a `PENDING_APPROVAL` plan, and the review endpoint can update a plan directly. The review service currently does not validate the source state.
- The deploy endpoint changes an `APPROVED` plan to `DEPLOYING` and its tasks to `PENDING`; it does not install patches on devices. Agent execution, final task outcomes, and rollback are planned.
- The sequence diagram uses an API client for the Manager because the Manager review form is not yet implemented in the frontend. The activity diagram has the same scope.
- The class diagram maps to `apps/api/prisma/schema.prisma`. `DeploymentPlansService` is shown as a control class with actual service operations; Prisma models are data entities, so methods are not invented on them.

For a report focused entirely on the intended final system, explain the planned transitions as design proposals. For a report on the working prototype, retain the implementation notes so readers can distinguish the deployed scaffold from the target workflow.
