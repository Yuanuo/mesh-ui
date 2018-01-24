import { Injectable } from '@angular/core';
import { ApplicationStateService } from '../../state/providers/application-state.service';
import { ApiService } from '../../core/providers/api/api.service';
import { BinaryField, MeshNode } from '../../common/models/node.model';
import { NodeUpdateRequest, NodeCreateRequest, FieldMapFromServer } from '../../common/models/server-models';
import { I18nNotification } from '../../core/providers/i18n-notification/i18n-notification.service';
import { ConfigService } from '../../core/providers/config/config.service';
import { simpleCloneDeep } from '../../common/util/util';
import { EntitiesService } from '../../state/providers/entities.service';


@Injectable()
export class EditorEffectsService {

    constructor(private state: ApplicationStateService,
                private entities: EntitiesService,
                private notification: I18nNotification,
                private config: ConfigService,
                private api: ApiService) {}

    openNode(projectName: string, nodeUuid: string, language?: string): void {
        // TODO: Make API call to get the node
        const lang = language || this.config.FALLBACK_LANGUAGE;
        this.state.actions.editor.openNode(projectName, nodeUuid, lang);

        // Refresh the node
        this.state.actions.list.fetchNodeStart(nodeUuid);
        this.api.project.getNode({ project: projectName, nodeUuid, lang })
            .subscribe(response => {
                this.state.actions.list.fetchNodeSuccess(response);
            }, error => {
                this.state.actions.list.fetchChildrenError();
                throw new Error('TODO: Error handling');
            });
    }

    /**
     * Create an placeholder object in the state for the new node
     * and open dispatch an action to open it in the editor
     * @param projectName
     * @param schemaUuid
     * @param parentNodeUuid
     * @param language
     */
    createNode(projectName: string, schemaUuid: string, parentNodeUuid: string, language: string): void {
        this.api.project.getNode({project: projectName, nodeUuid: parentNodeUuid})
            .subscribe(response => {
                this.state.actions.list.fetchNodeSuccess(response);
                this.state.actions.editor.openNewNode(projectName, schemaUuid, parentNodeUuid, language);
            }, error => {
                this.state.actions.list.fetchChildrenError();
                throw new Error('TODO: Error handling');
            });
    }

    /**
     * Save a new node to the api endpoint
     * @param projectName
     * @param node
     */
    saveNewNode(projectName: string, node: MeshNode): Promise<MeshNode | void> {
        this.state.actions.editor.saveNodeStart();

        const language = node.language || this.config.FALLBACK_LANGUAGE;

        const nodeCreateRequest: NodeCreateRequest = {
            fields: this.getNonBinaryFields(node),
            parentNode: node.parentNode,
            schema: node.schema,
            language: language,
        };

        return new Promise<MeshNode | void>(resolve => {
            this.api.project.createNode({ project: projectName }, nodeCreateRequest)
            .toPromise()
            .then(newNode => {
                this.uploadBinaries(newNode, this.getBinaryFields(node))
                .then(savedNode => {
                    this.state.actions.editor.saveNodeSuccess(savedNode as MeshNode, node);
                    this.notification.show({
                        type: 'success',
                        message: 'editor.node_saved'
                    });
                    resolve(savedNode);
                });

                /*if (node.fields['image'] && node.fields['image'].file) {
                    const binary: File = node.fields['image'].file as File;
                    this.uploadBinary(newNode.project.name, newNode.uuid, binary, newNode.language, newNode.version)
                    .then(uploadResponse => {
                        this.showStatusNotification(uploadResponse as MeshNode, 'success', 'editor.node_saved');
                        resolve(uploadResponse);
                    }, uploadError => {
                        this.state.actions.editor.saveNodeError();
                    });

                } else {
                    this.showStatusNotification(newNode, 'success', 'editor.node_saved');
                    resolve(newNode);
                }*/

            }, error => {
                this.state.actions.editor.saveNodeError();
                this.notification.show({
                    type: 'error',
                    message: 'editor.node_save_error'
                });
                throw new Error('TODO: Error handling');
            });
        });
    }

    /**
     * Save (or update) an existing node
     * @param node
     */
    saveNode(node: MeshNode): Promise<MeshNode | void> {
        if (!node.project.name) {
            throw new Error('Project name is not available');
        }

        this.state.actions.editor.saveNodeStart();

        const language = node.language || this.config.FALLBACK_LANGUAGE;

        const updateRequest: NodeUpdateRequest = {
            fields: this.getNonBinaryFields(node),
            version: node.version,
            language: language
        };

        return new Promise<MeshNode | void>(resolve => {
            this.api.project.updateNode({ project: node.project.name, nodeUuid: node.uuid, language }, updateRequest)
            .toPromise()
            .then(response => {
                if (response.conflict) {
                    // TODO: conflict resolution handling

                } else if (response.node) {
                    this.uploadBinaries(response.node, this.getBinaryFields(node))
                    .then(savedNode => {
                        this.state.actions.editor.saveNodeSuccess(savedNode as MeshNode, node);
                        this.notification.show({
                            type: 'success',
                            message: 'editor.node_saved'
                        });
                        resolve(savedNode);
                    });

                    /*if (node.fields['binary'] && node.fields['binary'].file) {
                        const binary: File = node.fields['binary'].file as File;
                        this.uploadBinary(node.project.name, response.node.uuid, binary, node.language, node.version)
                        .then(uploadResponse => {
                            this.showStatusNotification(uploadResponse as MeshNode, 'success', 'editor.node_saved');
                            resolve(uploadResponse);
                        }, uploadError => {
                            this.state.actions.editor.saveNodeError();
                        });
                    } else {
                        this.showStatusNotification(response.node, 'success', 'editor.node_saved');
                        resolve(response.node);
                    }*/
                } else {
                    this.state.actions.editor.saveNodeError(node);
                    this.notification.show({
                        type: 'error',
                        message: 'editor.node_save_error'
                    });
                }
            },
            error => {
                this.state.actions.editor.saveNodeError();
                this.notification.show({
                    type: 'error',
                    message: 'editor.node_save_error'
                });
                throw new Error('TODO: Error handling');
            });
        })
    }

    uploadBinary(project: string, nodeUuid: string, binary: File, language: string, version: string): Promise<MeshNode | void> {

        return this.api.project.updateBinaryField({
            project,
            nodeUuid,
            fieldName: 'binary',
        }, {
            binary,
            language,
            version
        })
        .toPromise();
    }

    publishNode(node: MeshNode): void {
        if (!node.project.name) {
            throw new Error('Project name is not available');
        }
        this.state.actions.editor.publishNodeStart();
        this.api.project.publishNode({ project: node.project.name, nodeUuid: node.uuid })
            .map(response => {
                let newVersion: string | undefined;
                if (response.availableLanguages && node.language) {
                    newVersion = response.availableLanguages[node.language!].version;
                }
                if (newVersion) {
                    return newVersion;
                } else {
                    throw new Error('New version could not be retrieved');
                }
            })
            .subscribe(version => {
                    this.notification.show({
                        type: 'success',
                        message: 'editor.node_published',
                        translationParams: { version }
                    });
                    const newNode = Object.assign({}, node, { version });
                    this.state.actions.editor.publishNodeSuccess(newNode);
                },
                error => {
                    this.state.actions.editor.publishNodeError();
                    this.notification.show({
                        type: 'error',
                        message: 'editor.node_publish_error'
                    });
                    throw new Error('TODO: Error handling');
                });
    }


    closeEditor(): void {
        this.state.actions.editor.closeEditor();
    }

    /**
     * Creates a translation of a node by cloning the given node and renaming certain fields which need to be unique.
     * This method is limited in that it does not work with binary fields and the renaming is naive and may fail.
     * TODO: update this when a translation endpoint in implemented in Mesh: https://github.com/gentics/mesh/issues/12
     */
    createTranslation(node: MeshNode, languageCode: string): Promise<MeshNode | void> {
        const clone = this.cloneNodeWithRename(node, languageCode.toUpperCase());
        if (clone) {
            clone.language = languageCode;
            return this.saveNode(clone);
        } else {
            return Promise.reject(`Could not create translation`);
        }
    }


    /**
     * Clones a node and changes the fields which should be unique in a given parentNode (i.e. displayField,
     * segmentField) by adding a suffix.
     */
    private cloneNodeWithRename(node: MeshNode, suffix: string): MeshNode | undefined {
        const clone = simpleCloneDeep(node);
        const schema = this.entities.getSchema(node.schema.uuid);
        if (schema) {
            const displayField = schema.displayField;
            const segmentField = schema.segmentField;

            if (typeof node.fields[displayField] === 'string') {
                clone.fields[displayField] += ` (${suffix})`;
            }
            if (segmentField && segmentField !== displayField && node.fields[segmentField]) {
                if (node.fields[segmentField].sha512sum) {
                    clone.fields[segmentField].fileName = this.addSuffixToString(node.fields[segmentField].fileName, suffix);
                } else if (node.fields[segmentField] !== undefined) {
                    clone.fields[segmentField] = this.addSuffixToString(clone.fields[segmentField], suffix);
                }
            }

            // Display a warning if there are any binary fields - these cannot be handled properly
            // until the dedicated translation endpoint is implemented in Mesh.
            const firstBinaryField = this.getFirstBinaryField(node);
            if (firstBinaryField && firstBinaryField.key !== undefined) {
                console.warn(`Note: binary fields cannot yet be copied.`);
            }

            return clone;
        }
    }

    private showStatusNotification(node: MeshNode, type: string, message: string) {
        this.state.actions.editor.saveNodeSuccess(node);
        this.notification.show({
            type: type,
            message: message
        });
    }

    /**
     * Given a string value, append the suffix to the end.
     * If the value has periods in it (as in a file name), then insert
     * the suffix before the file extension:
     *
     * foo => foo_de
     * foo.html => foo.de.html
     */
    private addSuffixToString(value: string, suffix: string, delimiter: string = '_'): string {
        const parts = value.split('.');
        if (1 < parts.length) {
            parts.splice(-1, 0, suffix);
            return parts.join('.');
        } else {
            return value + delimiter + suffix;
        }
    }

    /**
     * Given a node, check for any binary fields if one if found, return the first
     * in an object with key (field name) and value (binary field properties).
     */
    private getFirstBinaryField(node: MeshNode): { key: string; value: BinaryField } | undefined {
        let binaryFieldKey;
        let binaryFieldValue;

        if (node) {
            for (const key in node.fields) {
                if (node.fields.hasOwnProperty(key)) {
                    const field = node.fields[key];
                    if (field && field.fileSize) {
                        if (binaryFieldValue === undefined) {
                            binaryFieldKey = key;
                            binaryFieldValue = field;
                        }
                    }
                }
            }

            return {
                key: binaryFieldKey,
                value: binaryFieldValue
            };
        }
    }

    uploadBinary(project: string, nodeUuid: string, fieldName: string, binary: File, language: string, version: string): Promise<MeshNode | void> {
        return this.api.project.updateBinaryField({
            project,
            nodeUuid,
            fieldName,
        }, {
            binary,
            language,
            version
        })
        .toPromise();
    }

    uploadBinaries(node: MeshNode, fields: FieldMapFromServer): Promise<MeshNode> {
        // if no binaries are present - return the same node
        if (Object.keys(fields).length === 0) {
            return Promise.resolve(node);
        }

        const promises: Promise<MeshNode>[] = Object.keys(fields).reduce((promises: any[], key, index) => {
            promises.push(this.uploadBinary(node.project.name, node.uuid, key, fields[key].file, node.language, node.version));
            return promises;
        }, []);


        return new Promise<MeshNode>(resolve => {
            Promise.all(promises)
            .then(nodes => {
                // return the node from the last successfull request
                resolve(nodes.pop());
            });
        });
    }
    /**
     * Filter all the binary fields from the node
     */
    private getBinaryFields(node: MeshNode): FieldMapFromServer {
        return Object.keys(node.fields).reduce((fields, key, index) => {
            const field = node.fields[key];
            // we remove all the binaries before saving
            if ((field.file && field.file instanceof File) === true) {
                fields[key] = field;
            }
            return fields;
        }, {} as FieldMapFromServer);
    }

    private getNonBinaryFields(node: MeshNode): FieldMapFromServer {
        const binaryFields = this.getBinaryFields(node);
        return Object.keys(node.fields).reduce((nonBinaryFields, key) => {
            if (binaryFields[key] === undefined) {
                nonBinaryFields[key] = node.fields[key];
            }
            return nonBinaryFields;
        }, {} as FieldMapFromServer);
    }
}
