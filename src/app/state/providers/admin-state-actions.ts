import { Injectable } from '@angular/core';
import { CloneDepth, Immutable, StateActionBranch } from 'immutablets';

import { AppState } from '../models/app-state.model';
import { AuthState } from '../models/auth-state.model';
import { AdminState, AdminStateEntity, ProjectAssignments } from '../models/admin-state.model';
import { ChangePasswordModalComponent } from '../../core/components/change-password-modal/change-password-modal.component';
import { EntityState } from '../models/entity-state.model';
import { ProjectResponse, SchemaResponse, MicroschemaResponse } from '../../common/models/server-models';
import { uuidHash } from '../../common/util/util';
import { mergeEntityState } from './entity-state-actions';
import { MicroschemaReference } from '../../common/models/common.model';

@Injectable()
@Immutable()
export class AdminStateActions extends StateActionBranch<AppState> {
    @CloneDepth(1) private admin: AdminState;
    @CloneDepth(0) private entities: EntityState;

    constructor() {
        super({
            uses: ['admin', 'entities'],
            initialState: {
                admin: {
                    loadCount: 0,
                    assignedToProject: {},
                    displayedProjects: [],
                    displayedSchemas: [],
                    displayedMicroschemas: []
                }
            }
        });
    }

    actionStart() {
        this.admin.loadCount++;
    }

    actionSuccess() {
        this.admin.loadCount--;
    }

    actionError() {
        this.admin.loadCount--;
    }

    loadSchemasSuccess(schemas: SchemaResponse[]) {
        this.admin.loadCount--;
        this.admin.displayedSchemas = schemas.map(schema => schema.uuid);
        this.entities = mergeEntityState(this.entities, {
            schema: schemas
        });
    }

    createProjectSuccess(project: ProjectResponse) {
        this.admin.loadCount--;
        this.entities = mergeEntityState(this.entities, {
            project: {
                [project.uuid]: project
            }
        });
        this.admin.displayedProjects = [...this.admin.displayedProjects, project.uuid];
    }

    deleteProjectSuccess(projectUuid: string) {
        this.admin.displayedProjects = this.admin.displayedProjects.filter(uuid => uuid !== projectUuid);
    }

    deleteMicroschemaSuccess(microschemaUuid: string) {
        this.admin.loadCount--;
        this.admin.displayedMicroschemas = this.admin.displayedMicroschemas.filter(uuid => uuid !== microschemaUuid);
    }

    deleteSchemaSuccess(schemaUuid: string) {
        this.admin.loadCount--;
        this.admin.displayedSchemas = this.admin.displayedSchemas.filter(uuid => uuid !== schemaUuid);
    }

    updateMicroschemaSuccess(response: MicroschemaResponse) {
        this.admin.loadCount--;
        this.entities = mergeEntityState(this.entities, {
            microschema: {
                [response.uuid]: response
            }
        });
    }

    createMicroschemaSuccess(response: MicroschemaResponse) {
        this.admin.loadCount--;
        this.entities = mergeEntityState(this.entities, {
            microschema: {
                [response.uuid]: response
            }
        });
        this.admin.displayedMicroschemas = [...this.admin.displayedMicroschemas, response.uuid];
    }

    openMicroschemaStart() {
        this.admin.loadCount++;
        delete this.admin.openEntity;
    }

    openMicroschemaSuccess(microschema: MicroschemaResponse) {
        this.admin.loadCount--;
        this.admin.openEntity = {
            type: 'microschema',
            uuid: microschema.uuid,
            isNew: false
        };
        this.entities = mergeEntityState(this.entities, {
            microschema: {
                [microschema.uuid]: microschema
            }
        });
    }

    openMicroschemaError() {
        this.admin.loadCount--;
    }

    newMicroschema() {
        this.admin.openEntity = {
            type: 'microschema',
            isNew: true
        };
    }

    updateSchemaSuccess(response: SchemaResponse) {
        this.admin.loadCount--;
        this.entities = mergeEntityState(this.entities, {
            schema: {
                [response.uuid]: response
            }
        });
    }

    createSchemaSuccess(response: SchemaResponse) {
        this.admin.loadCount--;
        this.entities = mergeEntityState(this.entities, {
            schema: {
                [response.uuid]: response
            }
        });
        this.admin.displayedSchemas = [...this.admin.displayedSchemas, response.uuid];
    }

    openSchemaStart() {
        this.admin.loadCount++;
        delete this.admin.openEntity;
    }

    openSchemaSuccess(schema: SchemaResponse) {
        this.admin.loadCount--;
        this.admin.openEntity = {
            type: 'schema',
            uuid: schema.uuid,
            isNew: false
        };
        this.entities = mergeEntityState(this.entities, {
            schema: {
                [schema.uuid]: schema
            }
        });
    }

    openSchemaError() {
        this.admin.loadCount--;
    }

    newSchema() {
        this.admin.openEntity = {
            type: 'schema',
            isNew: true
        };
    }

    loadEntityAssignmentsStart() {
        this.admin.loadCount++;
    }

    loadEntityAssignmentProjectsSuccess(projects: ProjectResponse[]) {
        this.entities = mergeEntityState(this.entities, {
            project: projects
        });
    }

    loadEntityAssignmentsSuccess(assignments: ProjectAssignments) {
        this.admin.loadCount--;
        this.admin.assignedToProject = assignments;
    }

    loadEntityAssignmentsError() {
        this.admin.loadCount--;
    }
}
