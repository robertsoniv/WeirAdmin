angular.module('orderCloud')
    .service( 'OrderShareService', OrderShareService)
    .config(orderConfig)
    .controller('OrderCtrl',OrderController);

function OrderShareService() {
    var svc = {
        LineItems: [],
        Payments: [],
        Quote: null,
        Me: null
    };
    return svc;
}

function orderConfig($stateProvider, buyerid){
    $stateProvider.state('order', {
        parent: 'base',
        templateUrl: 'order/templates/order.tpl.html',
        controller: 'OrderCtrl',
        controllerAs: 'order',
        url: '/order',
        data: {componentName: 'order'},
        resolve: {
            Order: function(CurrentOrder){
                return CurrentOrder.Get();
            },
            DeliveryAddress: function (OrderCloud, Order) {
                if(Order.ShippingAddressID) {
                    return OrderCloud.Addresses.Get(Order.ShippingAddressID, buyerid);
                } else {
                    return null;
                }
            },
            LineItems: function ($q, $state, toastr, OrderCloud, CurrentOrder, OrderShareService, Order, LineItemHelpers) {
                OrderShareService.LineItems.length = 0;
	            var dfd = $q.defer();
	            CurrentOrder.GetID()
		            .then(function(id) {
			            OrderCloud.LineItems.List(Order.ID)
				            .then(function(data) {
					            if (!data.Items.length) {
						            toastr.error('Your quote does not contain any line items.', 'Error');
						            dfd.resolve({ Items: [] });
					            } else {
						            LineItemHelpers.GetProductInfo(data.Items)
							            .then(function () { dfd.resolve(data); });
					            }
				            })
		            })
		            .catch(function () {
		                toastr.error('Your quote does not contain any line items.', 'Error');
		                dfd.resolve({ Items: [] });
	                });
	            return dfd.promise;
            },
            Payments: function (Order, OrderCloud) {
                return OrderCloud.Payments.List(Order.ID);
            }
        }
    });
}
function OrderController($q, $scope, $rootScope, $state, $sce, $exceptionHandler, OrderCloud, Order, DeliveryAddress, LineItems, Payments, WeirService, Underscore, OrderToCsvService, buyerid, buyernetwork) {
    var vm = this;
    vm.Order = Order;
    vm.LineItems = LineItems;
    vm.DeliveryAddress = DeliveryAddress;
    vm.Status = Underscore.find(WeirService.OrderStatus, function(status) {
        return status.id == vm.Order.xp.Status;
    });
    vm.Payments = Payments;
    var labels = {
        en: {
            //header labels
            status: "Status",
            OrderDate: "Order date;",
            Confirm: "Confirm",
            Revise: "Revise",
            ShareRevision: "Share revision",
            Comments: "Comments",
            Download: "Download",
            Print: "Print",
            //paragraph above table
            WeirOrderNo: "Weir Order No;",
	        WeirQuoteNo: "Weir Quote No;",
            QuoteRef: "Your quote ref;",
            PONumber: "Your PO No;",
            //table labels
            SerialNum: "Serial number",
            TagNum: "Tag number (if available)",
            PartNum: "Part Number",
            Description: "Description of Part",
            RecReplacement: "Recommended replacement",
            LeadTimeAvailability: "Lead time / Availability",
            PricePerItem: "PricePerItem",
            Quantity: "Quantity",
            Total: "Total",
            //labels to right of table
            Edit: "Edit",
            Removed: "Removed",
            Updated: "Updated",
            New: "New",
            //buttons above table
            BackToQuote: "Back to Quotes",
            AddNewItems: "Add new items",
            AddABlankItem: "Add a blank item",
            //footers
            YourRefNo: "Your Reference No;",
            DelieveryAddress: "Delivery Address",
            YourAttachments: "Your attachments",
            YourComments: "Your comments or instructions"
        },
        fr: {
            //header labels
            status:$sce.trustAsHtml( "Status"),
            OrderDate:$sce.trustAsHtml( "Order date;"),
            Confirm:$sce.trustAsHtml( "Confirm"),
            Revise:$sce.trustAsHtml( "Revise"),
            ShareRevision:$sce.trustAsHtml( "Share revision"),
            Comments:$sce.trustAsHtml( "Comments"),
            Download:$sce.trustAsHtml( "Download"),
            Print:$sce.trustAsHtml( "Print"),
            //paragraph above table
            WeirOrderNo:$sce.trustAsHtml( "Weir Order No;"),
	        WeirQuoteNo: $sce.trustAsHtml( "Weir Quote No;"),
            QuoteRef:$sce.trustAsHtml( "Your quote ref;"),
            PONumber:$sce.trustAsHtml( "Your PO No;"),
            //table labels
            SerialNum:$sce.trustAsHtml( "Serial number"),
            TagNum:$sce.trustAsHtml( "Tag number (if available)"),
            PartNum:$sce.trustAsHtml( "Part Number"),
            Description:$sce.trustAsHtml( "Description of Part"),
            RecReplacement:$sce.trustAsHtml( "Recommended replacement"),
            LeadTimeAvailability:$sce.trustAsHtml( "Lead time / Availability"),
            PricePerItem:$sce.trustAsHtml( "PricePerItem"),
            Quantity:$sce.trustAsHtml( "Quantity"),
            Total:$sce.trustAsHtml( "Total"),
            //labels to right of table
            Edit:$sce.trustAsHtml( "Edit"),
            Removed:$sce.trustAsHtml( "Removed"),
            Updated:$sce.trustAsHtml( "Updated"),
            New:$sce.trustAsHtml( "New"),
            //buttons above table
            BackToQuote:$sce.trustAsHtml( "Back to Quotes"),
            AddNewItems:$sce.trustAsHtml( "Add new items"),
            AddABlankItem:$sce.trustAsHtml( "Add a blank item"),
            //footers
            YourRefNo:$sce.trustAsHtml( "Your Reference No;"),
            DelieveryAddress:$sce.trustAsHtml("Delivery Address"),
            YourAttachments:$sce.trustAsHtml( "Your attachments"),
            YourComments:$sce.trustAsHtml( "Your comments or instructions")
        }
    };
    vm.labels = labels[WeirService.Locale()];
    function toCsv() {
        return OrderToCsvService.ToCsvJson(vm.Order, vm.LineItems, vm.DeliveryAddress, vm.Payments, vm.labels);
    }
    vm.ToCsvJson = toCsv;
    vm.CsvFilename = vm.Order.ID + ".csv";

	vm.ShowEdit = _showEdit;
	function _showEdit(status, item) {
		return status==WeirService.OrderStatus.Review.id;
	}

	vm.ShowUpdated = _showUpdated;
	function _showUpdated(item) {
		// return true if qty <> xp.originalQty and qty > 0
		if(item.xp){
			return item.Quantity > 0 && (item.xp.OriginalQty && (item.Quantity != item.xp.OriginalQty));
		} else {
			return false;
		}
	}

	vm.ShowRemoved = _showRemoved;
	function _showRemoved(line) {
		if(line.xp) {
			return line.Quantity == 0 && line.xp.OriginalQty != 0;
		} else {
			return false;
		}
	}

	vm.ShowNew = _showNew;
	function _showNew(line) {
		if(line.xp) {
			return line.xp.OriginalQty==0;
		} else {
			return false;
		}
	}

	vm.ShowConfirm = _showConfirm;
	function _showConfirm() {
		var validStatus = {
			SB: true,
			SP: true
		};
		if(vm.Order.xp) {
			return validStatus[vm.Order.xp.Status];
		} else {
			return false;
		}
	}

	vm.ShowRevise = _showRevise;
	function _showRevise() {
		var validStatus = {
			SB: true,
			SP: true
		};
		if(vm.Order.xp) {
			return validStatus[vm.Order.xp.Status];
		} else {
			return false;
		}
	}
	vm.ShowShareRevision = _showShareRevision;
	function _showShareRevision() {
		var validStatus = {
			RE: true
		};
		if(vm.Order.xp) {
			return validStatus[vm.Order.xp.Status];
		} else {
			return false;
		}
	}

	vm.ShowAddItems = _showAddItems;
	function _showAddItems() {
		var validStatus = {
			RE: true
		};
		if(vm.Order.xp) {
			return validStatus[vm.Order.xp.Status];
		} else {
			return false;
		}
	}

	vm.AddNewItem = _addNewItem;
	function _addNewItem() {
		var newItem = {
			"ProductID": "",
			"Quantity": 0,
			"DateAdded": "",
			"QuantityShipped": 0,
			"UnitPrice": 0,
			"LineTotal": 0,
			"CostCenter": null,
			"DateNeeded": null,
			"ShippingAccount": null,
			"ShippingAddressID": null,
			"ShippingAddress": null,
			"ShipFromAddressID": null,
			"ShipFromAddress": null,
			"Specs": [],
			"xp": {
				"SN": "",
				"TagNumber": "",
				"OriginalQty": 0
			}
		};
		vm.LineItems.Items.push(newItem);
	}

	vm.EditLineItem = _editLineItem;
	function _editLineItem(line) {
		var patch = {
			Quantity: line.Quantity
		};
		OrderCloud.LineItems.Patch(vm.Order.ID, line.ID, patch, buyerid)
			.then(function() {
				$rootScope.$broadcast('SwitchCart');
				$state.go($state.current,{}, {reload:true});
			})
			.catch(function(ec) {
				$exceptionHandler(ex);
			})
	}

	vm.ShareRevision = _shareRevision;
	function _shareRevision(currentUser) {
		//Set the status to revised. set the status date. set the ReviewerName.
		var orderType = {
			Quote: WeirService.OrderStatus.RevisedQuote.id,
			Order: WeirService.OrderStatus.RevisedOrder.id
		};

		var patch = {
			xp: {
				Status: orderType[vm.Order.xp.Type],
				StatusDate: new Date(),
				ReviewerName: currentUser.FirstName + " " + currentUser.LastName
			}
		};

		if(patch.xp.Status) {
			OrderCloud.Orders.Patch(vm.Order.ID, patch, buyerid)
				.then(function() {
					$state.go($state.current,{}, {reload:true});
				})
				.catch(function(ex) {
					$exceptionHandler(ex);
				})
		}
	}

	vm.Confirm = _confirm;
	function _confirm(currentUser) {
		var confirmedStatus = {
			SB:WeirService.OrderStatus.ConfirmedQuote.id,
			SP:WeirService.OrderStatus.ConfirmedOrder.id
		};

		var patch = {
			xp: {
				Status: confirmedStatus[vm.Order.xp.Status],
				StatusDate: new Date(),
				ReviewerName: currentUser.FirstName + " " + currentUser.LastName
			}
		};

		if(patch.xp.Status) {
			OrderCloud.Orders.Patch(vm.Order.ID, patch, buyerid)
				.then(function() {
					$state.go($state.current,{}, {reload:true});
				})
				.catch(function(ex) {
					$exceptionHandler(ex);
				});
		} else {
			return; //invlaid status for confirming. should not have shown the button.
		}
	}

	vm.Revise = _revise;
	function _revise(currentUser) {
		var deferred = $q.defer();
		var queue = [];
		// On the first revision there will be no original order id, so set it. This way we can see all related items in the revisions list view.
		vm.Order.xp.OriginalOrderID = vm.Order.xp.OriginalOrderID ? vm.Order.xp.OriginalOrderID: vm.Order.ID;

		// Make deep copies so changes to one do not change the other.
		var orderCopy = angular.copy(vm.Order);
		var lineItemsCopy = angular.copy(vm.LineItems); //a 'new line' would have original qty 0; a deleted line would have orig qty <> 0

		// The copy will be the historical version of the order. This way we maintain the submission status in the original
		orderCopy.xp.Active = false;
		if(vm.Order.xp.Type == "Quote") {
			orderCopy.xp.Status = WeirService.OrderStatus.RevisedQuote.id;
		} else if (vm.Order.xp.Type == "Order") {
			orderCopy.xp.Status = WeirService.OrderStatus.RevisedOrder.id;
		} else {
			return; //shouldn't have an order with no xp.Type
		}

		orderCopy.xp.StatusDate = new Date();

		function _determineRevision(orderID) {
			var rev = null;
			var pieces = orderID.split("-Rev");
			angular.forEach(pieces, function(value, key) {
				if(key==1) {
					value++;
					rev = pieces[0] + "-Rev" + value.toString();
				} else {
					rev = orderID + "-Rev0"; //There is no revision. Set it to 0.
				}
			});
			return rev;
		}

		orderCopy.ID = _determineRevision(orderCopy.ID); //Rev0 or current rev +1
		vm.Order.ID = _determineRevision(orderCopy.ID); //ordercopy rev +1

		//foreach lineitemcopy, set the xp.OriginalQty to the original line item quantity.
		var originalItem = {};
		angular.forEach(lineItemsCopy.Items, function(item, key) {
			item.xp = typeof(item.xp) == 'undefined' ? {} : item.xp;
			originalItem = Underscore.findWhere(vm.LineItems.Items,{ID:item.ID});
			item.xp.OriginalQty = originalItem.Quantity;
		});

		var orderPatch = {
			ID: vm.Order.ID,
			xp: {
				Active: true,
				Status: WeirService.OrderStatus.Review.id,
				StatusDate: new Date(),
				ReviewerName: currentUser.FirstName + " " + currentUser.LastName,
				OriginalOrderID: vm.Order.xp.OriginalOrderID
			}
		};

		var impersonation = {
			ClientID: buyernetwork,
			Claims: []
		};

		// Patch the current order with the updated status, ID and active state.
		OrderCloud.Orders.Patch(vm.Order.xp.OriginalOrderID, orderPatch, buyerid)
			.then(function(order) {
				// Get the details of the user that placed the order.
                return OrderCloud.Users.Get(order.FromUserID, order.xp.BuyerId);
			})
            .then(function(buyer) {
            	// Get an access token for impersonation.
	            impersonation.Claims = buyer.AvailableRoles;
                return OrderCloud.Users.GetAccessToken(vm.Order.FromUserID, impersonation, vm.Order.xp.BuyerId);
			})
            .then(function(data) {
            	// Set the local impersonation token so that As() can be used.
                OrderCloud.Auth.SetImpersonationToken(data['access_token']);
            })
			.then(function() {
				// Create the order as the impersonated user.
				return OrderCloud.As().Orders.Create(orderCopy, buyerid);
			})
			.then(function(order) {
				// Create the line items.
				angular.forEach(lineItemsCopy.Items, function(value, key) {
					queue.push(OrderCloud.LineItems.Create(orderCopy.ID, value, buyerid));
				});
				$q.all(queue)
					.then(function(results) {
						deferred.resolve(results);
					});
				return deferred.promise;
			})
			.then(function() {
				// lock in the price on the line items. don't want them changing.
				return OrderCloud.Orders.Submit(orderCopy.ID, orderCopy.xp.BuyerId);
			})
			.then(function() {
				// Remove the impersonation token.
				return OrderCloud.Auth.RemoveImpersonationToken();
			})
			.then(function() {
				// Set the current order so that the order details page is updated.
				return WeirService.SetOrderAsCurrentOrder(vm.Order.ID);
			})
			.then(function() {
				// Update the mini-cart with the new order and refresh the page.
				$rootScope.$broadcast('SwitchCart');
				$state.go($state.current,{}, {reload:true});
			})
			.catch(function(ex) {
				$exceptionHandler(ex);
			});
	}
}