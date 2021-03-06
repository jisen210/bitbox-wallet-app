/**
 * Copyright 2018 Shift Devices AG
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { h, Component, RenderableProps, ComponentConstructor, FunctionalComponent } from 'preact';
import { Endpoint, EndpointsObject, EndpointsFunction } from './endpoint';
import { apiSubscribe, Event } from '../utils/event';
import { apiGet } from '../utils/request';
import { KeysOf } from '../utils/types';
import { equal } from '../utils/equal';
import { load } from './load';
import { getDisplayName } from '../utils/component';

/**
 * Loads API endpoints into the props of the component that uses this decorator and updates them on events.
 * 
 * @param endpointsObjectOrFunction - The endpoints that should be loaded to their respective property name.
 * @param renderOnlyOnceLoaded - Whether the decorated component shall only be rendered once all endpoints are loaded.
 * @param subscribeWithoutLoading - Whether the endpoints shall only be subscribed without loading them first.
 * @return A function that returns the higher-order component that loads and updates the endpoints into the props of the decorated component.
 */
export function subscribe<LoadedProps, ProvidedProps = {}>(
    endpointsObjectOrFunction: EndpointsObject<LoadedProps> | EndpointsFunction<ProvidedProps, LoadedProps>,
    renderOnlyOnceLoaded: boolean = true, // Use false only if all loaded props are optional!
    subscribeWithoutLoading: boolean = false,
) {
    return function decorator(
        WrappedComponent: ComponentConstructor<LoadedProps & ProvidedProps> | FunctionalComponent<LoadedProps & ProvidedProps>,
    ) {
        return class Subscribe extends Component<ProvidedProps & Partial<LoadedProps>, LoadedProps> {
            static displayName = `Subscribe(${getDisplayName(WrappedComponent)})`;

            private determineEndpoints(): EndpointsObject<LoadedProps> {
                if (typeof endpointsObjectOrFunction === 'function') {
                    return endpointsObjectOrFunction(this.props);
                }
                return endpointsObjectOrFunction;
            }

            private endpoints: EndpointsObject<LoadedProps>;

            private subscriptions: { [Key in keyof LoadedProps]?: () => void } = {};

            private unsubscribeEndpoint(key: keyof LoadedProps) {
                const subscription = this.subscriptions[key];
                if (subscription !== undefined) {
                    subscription();
                    delete this.subscriptions[key];
                }
            }

            private subscribeEndpoint(key: keyof LoadedProps, endpoint: Endpoint): void {
                this.unsubscribeEndpoint(key);
                this.subscriptions[key] = apiSubscribe(endpoint, (event: Event) => {
                    switch (event.action) {
                    case 'replace':
                        this.setState({ [key]: event.object } as Pick<LoadedProps, keyof LoadedProps>);
                        break;
                    case 'prepend':
                        this.setState(state => ({ [key]: [event.object, ...state[key]] }));
                        break;
                    case 'append':
                        this.setState(state => ({ [key]: [...state[key], event.object] }));
                        break;
                    case 'remove':
                        this.setState(state => ({ [key]: state[key].filter(item => !equal(item, event.object)) }));
                        break;
                    case 'reload':
                        apiGet(event.subject).then(object => this.setState({ [key]: object } as Pick<LoadedProps, keyof LoadedProps>));
                        break;
                    }
                });
            }

            private subscribeEndpoints(): void {
                const oldEndpoints = this.endpoints;
                const newEndpoints = this.determineEndpoints();
                // Update the endpoints that were different or undefined before.
                for (const key of Object.keys(newEndpoints) as KeysOf<LoadedProps>) {
                    if (oldEndpoints == null || newEndpoints[key] !== oldEndpoints[key]) {
                        this.subscribeEndpoint(key, newEndpoints[key]);
                    }
                }
                if (oldEndpoints != null) {
                    // Remove endpoints that no longer exist from the state.
                    for (const key of Object.keys(oldEndpoints) as KeysOf<LoadedProps>) {
                        if (newEndpoints[key] === undefined) {
                            this.unsubscribeEndpoint(key);
                            this.setState({ [key]: undefined as any } as Pick<LoadedProps, keyof LoadedProps>);
                        }
                    }
                }
                this.endpoints = newEndpoints;
            }

            public componentDidMount(): void {
                this.subscribeEndpoints();
            }

            public componentDidUpdate(): void {
                this.subscribeEndpoints();
            }

            public componentWillUnmount() {
                for (const key of Object.keys(this.subscriptions) as KeysOf<LoadedProps>) {
                    this.unsubscribeEndpoint(key);
                }
            }

            private readonly component = subscribeWithoutLoading ? WrappedComponent : load(endpointsObjectOrFunction, renderOnlyOnceLoaded)(WrappedComponent);

            public render(props: RenderableProps<ProvidedProps & Partial<LoadedProps>>, state: LoadedProps): JSX.Element {
                return <this.component {...state} {...props} />;
            }
        };
    };
}
