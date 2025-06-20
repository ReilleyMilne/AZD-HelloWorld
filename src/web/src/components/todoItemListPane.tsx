import { CommandBar, DetailsList, DetailsListLayoutMode, IStackStyles, Selection, Label, Spinner, SpinnerSize, Stack, IIconProps, SearchBox, Text, IGroup, IColumn, MarqueeSelection, FontIcon, IObjectWithKey, CheckboxVisibility, IDetailsGroupRenderProps, getTheme } from '@fluentui/react';
import { ReactElement, useEffect, useState, FormEvent, FC, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { TodoItem, TodoItemState, TodoList } from '../models';
import { stackItemPadding } from '../ux/styles';
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, isPast } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { locationService, LocationData } from '../services/locationService';

interface TodoItemListPaneProps {
    list?: TodoList
    items?: TodoItem[]
    selectedItem?: TodoItem;
    disabled: boolean
    onCreated: (item: TodoItem) => void
    onDelete: (item: TodoItem) => void
    onComplete: (item: TodoItem) => Promise<void>
    onSelect: (item?: TodoItem) => void
}

interface TodoDisplayItem extends IObjectWithKey {
    id?: string
    listId: string
    name: string
    state: TodoItemState
    description?: string
    dueDate: Date | string
    completedDate: Date | string
    data: TodoItem
    createdDate?: Date
    updatedDate?: Date
    originalDueDate?: Date | string
}

const addIconProps: IIconProps = {
    iconName: 'Add',
    styles: {
        root: {
        }
    }
};

const createListItems = (items: TodoItem[]): TodoDisplayItem[] => {
    return items.map(item => ({
        ...item,
        key: item.id,
        dueDate: item.dueDate ? new Date(item.dueDate).toDateString() : 'None',
        completedDate: item.completedDate ? new Date(item.completedDate).toDateString() : 'N/A',
        data: item,
        // Keep the original due date for countdown calculations
        originalDueDate: item.dueDate
    }));
};

const stackStyles: IStackStyles = {
    root: {
        alignItems: 'center'
    }
}

const TodoItemListPane: FC<TodoItemListPaneProps> = (props: TodoItemListPaneProps): ReactElement => {
    const theme = getTheme();
    const navigate = useNavigate();
    const [newItemName, setNewItemName] = useState('');
    const [items, setItems] = useState(createListItems(props.items || []));
    const [selectedItems, setSelectedItems] = useState<TodoItem[]>([]);
    const [isDoneCategoryCollapsed, setIsDoneCategoryCollapsed] = useState(true);
    const [tick, setTick] = useState(0); // For realtime countdown
    const [userLocation, setUserLocation] = useState<LocationData | null>(null);
    const [locationLoading, setLocationLoading] = useState(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const selection = new Selection({
        onSelectionChanged: () => {
            const selectedItems = selection.getSelection().map(item => (item as TodoDisplayItem).data);
            setSelectedItems(selectedItems);
        }
    });

    // Handle list changed
    useEffect(() => {
        setIsDoneCategoryCollapsed(true);
        setSelectedItems([]);
    }, [props.list]);

    // Handle items changed
    useEffect(() => {
        const sortedItems = (props.items || []).sort((a, b) => {
            if (a.state === b.state) {
                return a.name < b.name ? -1 : 1;
            }

            return a.state < b.state ? -1 : 1;
        })
        setItems(createListItems(sortedItems || []));
    }, [props.items]);

    // Handle selected item changed
    useEffect(() => {
        if (items.length > 0 && props.selectedItem?.id) {
            selection.setKeySelected(props.selectedItem.id, true, true);
        }
    }, [items.length, props.selectedItem, selection])

    // Tick interval for countdown
    useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Get user location on component mount
    useEffect(() => {
        const getUserLocation = async () => {
            setLocationLoading(true);
            try {
                const location = await locationService.getCurrentLocation();
                setUserLocation(location);
            } catch (error) {
                console.warn('Could not get user location:', error);
            } finally {
                setLocationLoading(false);
            }
        };

        getUserLocation();
    }, []);

    const groups: IGroup[] = useMemo(() => [
        {
            key: TodoItemState.Todo,
            name: 'Todo',
            count: items.filter(i => i.state === TodoItemState.Todo).length,
            startIndex: items.findIndex(i => i.state === TodoItemState.Todo),
        },
        {
            key: TodoItemState.InProgress,
            name: 'In Progress',
            count: items.filter(i => i.state === TodoItemState.InProgress).length,
            startIndex: items.findIndex(i => i.state === TodoItemState.InProgress)
        },
        {
            key: TodoItemState.Done,
            name: 'Done',
            count: items.filter(i => i.state === TodoItemState.Done).length,
            startIndex: items.findIndex(i => i.state === TodoItemState.Done),
            isCollapsed: isDoneCategoryCollapsed
        },
    ], [items, isDoneCategoryCollapsed])

    const onFormSubmit = (evt: FormEvent<HTMLFormElement>) => {
        evt.preventDefault();

        if (newItemName && props.onCreated) {
            const item: TodoItem = {
                name: newItemName,
                listId: props.list?.id || '',
                state: TodoItemState.Todo,
            }
            props.onCreated(item);
            setNewItemName('');
        }
    }

    const onNewItemChanged = (_evt?: FormEvent<HTMLInputElement>, value?: string) => {
        setNewItemName(value || '');
    }

    const selectItem = (item: TodoDisplayItem) => {
        navigate(`/lists/${item.data.listId}/items/${item.data.id}`);
    }

    const completeItems = async () => {
        console.log('Completing items:', selectedItems);
        
        // Process each selected item for completion
        for (const item of selectedItems) {
            console.log('Processing item for completion:', item.name, 'Current state:', item.state);
            await props.onComplete(item);
        }
        
        console.log('All items completed');
    }

    const deleteItems = () => {
        selectedItems.map(item => props.onDelete(item));
    }

    const onToggleCollapse = (group: IGroup) => {
        if (group.key === TodoItemState.Done) {
            setIsDoneCategoryCollapsed(!group.isCollapsed);
        }
    }

    const columns: IColumn[] = [
        { 
            key: 'name', 
            name: 'Name', 
            fieldName: 'name', 
            minWidth: 100,
            styles: {
                cellTitle: {
                    textAlign: 'left'
                }
            }
        },
        { 
            key: 'dueDate', 
            name: 'Due', 
            fieldName: 'dueDate', 
            minWidth: 100,
            styles: {
                cellTitle: {
                    textAlign: 'right'
                }
            }
        },
        { 
            key: 'countdown', 
            name: 'Countdown', 
            fieldName: 'countdown', 
            minWidth: 120,
            styles: {
                cellTitle: {
                    textAlign: 'right'
                }
            }
        },
        { 
            key: 'completedDate', 
            name: 'Completed', 
            fieldName: 'completedDate', 
            minWidth: 100,
            styles: {
                cellTitle: {
                    textAlign: 'right'
                }
            }
        },
    ];

    const groupRenderProps: IDetailsGroupRenderProps = {
        headerProps: {
            styles: {
                groupHeaderContainer: {
                    backgroundColor: theme.palette.neutralPrimary
                }
            },
            onToggleCollapse: onToggleCollapse
        }
    }

    const renderItemColumn = (item: TodoDisplayItem, _index?: number, column?: IColumn) => {
        // Reference tick to ensure re-render every second
        void tick;
        const fieldContent = item[column?.fieldName as keyof TodoDisplayItem] as string;

        switch (column?.key) {
            case "name":
                return (
                    <>
                        <Text variant="small" block>{item.name}</Text>
                        {item.description &&
                            <>
                                <FontIcon iconName="QuickNote" style={{ padding: "5px 5px 5px 0" }} />
                                <Text variant="smallPlus">{item.description}</Text>
                            </>
                        }
                    </>
                );
            case "countdown": {
                // Handle edge case 4: When items are in done, their countdown timer should be set to Complete and be in green text
                if (item.state === TodoItemState.Done) {
                    return (
                        <Text 
                            variant="small" 
                            style={{ 
                                textAlign: 'right', 
                                width: '100%', 
                                color: '#107c10', // Green color
                                fontWeight: 'bold' 
                            }}
                        >
                            Complete
                        </Text>
                    );
                }

                // Calculate countdown from now to dueDate using date-fns with timezone awareness
                let countdownText = "N/A";
                let countdownColor = '#666'; // Default gray color
                let totalMinutes = 0;
                
                // Use originalDueDate to preserve the time component
                if (item.originalDueDate && item.originalDueDate !== 'None') {
                    const due = new Date(item.originalDueDate);
                    
                    // Get current time in user's timezone
                    const userTimezone = userLocation?.timezone || locationService.getCurrentTimezone();
                    const now = new Date();
                    const zonedNow = toZonedTime(now, userTimezone);
                    const zonedDue = toZonedTime(due, userTimezone);
                    
                    if (isPast(zonedDue)) {
                        countdownText = "Due!";
                        countdownColor = '#d13438'; // Red for overdue
                    } else {
                        totalMinutes = differenceInMinutes(zonedDue, zonedNow);
                        const days = differenceInDays(zonedDue, zonedNow);
                        const hours = differenceInHours(zonedDue, zonedNow) % 24;
                        const minutes = differenceInMinutes(zonedDue, zonedNow) % 60;
                        const seconds = differenceInSeconds(zonedDue, zonedNow) % 60;
                        
                        // Color gradient based on time remaining
                        if (totalMinutes <= 60) { // Less than 1 hour - Red
                            countdownColor = '#d13438';
                        } else if (totalMinutes <= 360) { // Less than 6 hours - Orange
                            countdownColor = '#ff8c00';
                        } else if (totalMinutes <= 1440) { // Less than 1 day - Yellow
                            countdownColor = '#ffd700';
                        } else if (totalMinutes <= 4320) { // Less than 3 days - Light Green
                            countdownColor = '#90ee90';
                        } else { // More than 3 days - Green
                            countdownColor = '#107c10';
                        }
                        
                        // Add location info if available
                        const locationInfo = userLocation?.city ? ` (${userLocation.city})` : '';
                        countdownText = `${days}d ${hours}h ${minutes}m ${seconds}s${locationInfo}`;
                    }
                }
                return (
                    <Text 
                        variant="small" 
                        style={{ 
                            textAlign: 'right', 
                            width: '100%', 
                            color: countdownColor,
                            fontWeight: totalMinutes <= 360 ? '600' : '400' // Bold for urgent items
                        }}
                    >
                        {countdownText}
                    </Text>
                );
            }
            case "dueDate":
            case "completedDate":
                return (<Text variant="small" style={{ textAlign: 'right', width: '100%' }}>{fieldContent}</Text>)
            default:
                return (<Text variant="small">{fieldContent}</Text>)
        }
    }

    return (
        <Stack>
            <Stack.Item>
                <form onSubmit={onFormSubmit}>
                    <Stack horizontal styles={stackStyles}>
                        <Stack.Item grow={1}>
                            <SearchBox value={newItemName} placeholder="Add an item" iconProps={addIconProps} onChange={onNewItemChanged} disabled={props.disabled} />
                        </Stack.Item>
                        <Stack.Item>
                            <CommandBar
                                items={[
                                    {
                                        key: 'markComplete',
                        text: 'Mark Complete',
                                        disabled: props.disabled,
                                        iconProps: { iconName: 'Completed' },
                                        onClick: () => { completeItems() }
                                    },
                                    {
                                        key: 'delete',
                                        text: 'Delete',
                                        disabled: props.disabled,
                                        iconProps: { iconName: 'Delete' },
                                        onClick: () => { deleteItems() }
                                    }
                                ]}
                                ariaLabel="Todo actions" />
                        </Stack.Item>
                    </Stack>
                </form>
            </Stack.Item>
            {locationLoading && (
                <Stack.Item>
                    <Text variant="small" style={{ color: '#666', fontStyle: 'italic' }}>
                        <FontIcon iconName="Location" style={{ marginRight: '5px' }} />
                        Getting your location for accurate countdown...
                    </Text>
                </Stack.Item>
            )}
            {userLocation && !locationLoading && (
                <Stack.Item>
                    <Text variant="small" style={{ color: '#666', fontStyle: 'italic' }}>
                        <FontIcon iconName="Location" style={{ marginRight: '5px' }} />
                        Location: {userLocation.city || 'Unknown'}, Timezone: {userLocation.timezone}
                    </Text>
                </Stack.Item>
            )}
            {items.length > 0 &&
                <Stack.Item>
                    <MarqueeSelection selection={selection}>
                        <DetailsList
                            items={items}
                            groups={groups}
                            columns={columns}
                            groupProps={groupRenderProps}
                            setKey="id"
                            onRenderItemColumn={renderItemColumn}
                            selection={selection}
                            layoutMode={DetailsListLayoutMode.justified}
                            selectionPreservedOnEmptyClick={true}
                            ariaLabelForSelectionColumn="Toggle selection"
                            ariaLabelForSelectAllCheckbox="Toggle selection for all items"
                            checkButtonAriaLabel="select row"
                            checkboxVisibility={CheckboxVisibility.always}
                            onActiveItemChanged={selectItem} />
                    </MarqueeSelection>
                </Stack.Item>
            }
            {!props.items &&
                <Stack.Item align="center" tokens={stackItemPadding}>
                    <Label>Loading List Items...</Label>
                    <Spinner size={SpinnerSize.large} labelPosition="top" /> 
                </Stack.Item>
            }
            {props.items && items.length === 0 &&
                <Stack.Item align="center" tokens={stackItemPadding}>
                    <Text>This list is empty.</Text>
                </Stack.Item>
            }
        </Stack>
    );
};

export default TodoItemListPane;