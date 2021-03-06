/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { OpenShiftItem } from './openshiftItem';
import { OpenShiftObject, Command } from '../odo';
import * as vscode from 'vscode';
import * as validator from 'validator';
import { Progress } from '../util/progress';

export class Project extends OpenShiftItem {

    static async create(): Promise<string> {
        let projectName = await vscode.window.showInputBox({
            prompt: "Mention Project name",
            validateInput: (value: string) => {
                const validationMessage = Project.validateName(value);
                if (!validationMessage) return Project.validateMatches('Not a valid Project name. Please use lower case alphanumeric characters or "-", and must start and end with an alphanumeric character', value);
                return validationMessage;
            }
        });
        if (!projectName) return null;
        projectName = projectName.trim();
        return Project.odo.execute(Command.createProject(projectName))
            .then(() => Project.explorer.refresh())
            .then(() => `Project '${projectName}' successfully created`)
            .catch((error) => Promise.reject(`Failed to create Project with error '${error}'`));
    }

    static async del(context: OpenShiftObject): Promise<string> {
        let result: Promise<string> = null;
        const project = await Project.getOpenShiftCmdData(context,
            "Select Project to delete"
        );
        if (project) {
            const value = await vscode.window.showWarningMessage(`Do you want to delete Project '${project.getName()}'?`, 'Yes', 'Cancel');
            if (value === 'Yes') {
                result = Progress.execFunctionWithProgress(`Deleting Project '${project.getName()}'`,
                    (progress) => Project.odo.execute(Command.deleteProject(project.getName()))
                        .then(() => Project.odo.execute(Command.waitForProjectToBeGone(project.getName()), process.cwd(), false))
                        .then(() => Project.explorer.refresh())
                        .then(() => `Project '${project.getName()}' successfully deleted`)
                        .catch((err) => Promise.reject(`Failed to delete Project with error '${err}'`))
                );
            }
        }
        return result;
    }

    private static validateName(value: string) {
        if (validator.isEmpty(value.trim())) {
            return 'Empty project name';
        } else if (!validator.isAlphanumeric(value.trim())) {
            return 'Project name should be alphanumeric';
        } else if (!validator.isLength(value.trim(), 0, 63)) {
            return 'Project name is to long';
        }
    }
}