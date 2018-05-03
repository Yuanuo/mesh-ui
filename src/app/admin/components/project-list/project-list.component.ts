import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ModalService } from 'gentics-ui-core';

import { ApplicationStateService } from '../../../state/providers/application-state.service';
import { CreateProjectModalComponent } from '../create-project-modal/create-project-modal.component';
import { Project } from '../../../common/models/project.model';
import { EntitiesService } from '../../../state/providers/entities.service';
import { AdminProjectEffectsService } from '../../providers/effects/admin-project-effects.service';
import { notNullOrUndefined } from "../../../common/util/util";

@Component({
    templateUrl: './project-list.component.html',
    styleUrls: ['./project-list.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectListComponent implements OnInit {
    projects$: Observable<Project[]>;
    projectsLoading$: Observable<boolean>;

    constructor(private state: ApplicationStateService,
                private entities: EntitiesService,
                private modal: ModalService,
                private adminProjectEffects: AdminProjectEffectsService) {}

    ngOnInit(): void {
        this.projects$ = this.state.select(state => state.adminProjects.projectList)
            .map(uuids => uuids
                .map(uuid => this.entities.getProject(uuid))
                .filter(notNullOrUndefined)
            );

        this.projectsLoading$ = this.state.select(state => state.list.loadCount > 0);
        this.adminProjectEffects.loadProjects();
    }

    create(): void {
        this.modal.fromComponent(CreateProjectModalComponent)
            .then(modal => modal.open());
    }
}
