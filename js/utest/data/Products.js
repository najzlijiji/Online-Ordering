define([], function() {
    return {
        "defaults": {
            "description": null,
            "id": null,
            "id_category" : null,
            "image": null,
            "images": [],
            "is_cold": false,
            "name": null,
            "price": null,
            "img" : null,
            "tax" : 0,
            "sort": null,
            "course_number" : null,
            "cost" : null,
            "sold_by_weight" : false,
            "uom" : "",
            "attribute_type": 0,
            "child_products": null,
            "attribute_1_name": null,
            "attribute_2_name": null,
            "attribute_1_enable": false,
            "attribute_2_enable": false,
            "attribute_1_selected": null,
            "attribute_2_selected": null,
            "is_gift": false,
            "gift_card_number": null,
            "checked_gift_cards": null,
            "stock_amount": 999,
            "active": true,
            "created_date": null,
            "original_tax": null,
            "timetables": null,
            "compositeId": null
        },
        "defaults_initialized": {
            "description": null,
            "id": null,
            "id_category" : null,
            "image": 'test.png',
            "images": [],
            "is_cold": false,
            "name": null,
            "price": null,
            "img" : './test/path/',
            "tax" : 0,
            "sort": null,
            "course_number" : null,
            "cost" : null,
            "sold_by_weight" : false,
            "uom" : "",
            "attribute_type": 0,
            "child_products": null,
            "attribute_1_name": null,
            "attribute_2_name": null,
            "attribute_1_enable": false,
            "attribute_2_enable": false,
            "attribute_1_selected": null,
            "attribute_2_selected": null,
            "is_gift": false,
            "gift_card_number": null,
            "checked_gift_cards": {},
            "stock_amount": 999,
            "active": true,
            "created_date": 0,
            "original_tax": 0,
            "timetables": null,
            "compositeId": null
        },
        "product_with_image": {
            "description": "some product",
            "id": 12,
            "id_category" : 1,
            "image": 'test_image.png',
            "images": [],
            "is_cold": false,
            "name": "Test product",
            "price": 9.50,
            "img" : null,
            "tax" : 0,
            "sort": 12,
            "course_number" : null,
            "cost" : 1,
            "sold_by_weight" : false,
            "uom" : "",
            "attribute_type": 0,
            "child_products": null,
            "attribute_1_name": null,
            "attribute_2_name": null,
            "attribute_1_enable": false,
            "attribute_2_enable": false,
            "attribute_1_selected": null,
            "attribute_2_selected": null,
            "is_gift": false,
            "gift_card_number": null,
            "checked_gift_cards": {},
            "stock_amount": 999,
            "active": true,
            "created_date": '2015/01/01',
            "original_tax": null,
            "timetables": null,
            "compositeId": '12_1'
        },
        "addJSON_without_image": {
            "image": "",
            "created_date": 12,
            "original_tax": 2
        },
        "addJSON_with_image": {
            "image": "test.png",
            "created_date": 12,
            "original_tax": 2
        },
        "addJSON_is_gift_false": {
            "image": "test.png",
            "created_date": 12,
            "is_gift": false,
            "original_tax": 2
        },
        "addJSON_is_gift_true": {
            "image": "test.png",
            "created_date": 12,
            "is_gift": true,
            "original_tax": 2
        },
        "addJSON_with_original_tax1": {
            "image": "test.png",
            "created_date": 12,
            "original_tax": '2.12'
        },
        "addJSON_with_original_tax2": {
            "image": "test.png",
            "created_date": 12,
            "original_tax": 2.12
        },
        "addJSON_without_original_tax": {
            "image": "test.png",
            "created_date": 12,
            "tax": '2.12'
        },
        "addJSON_with_created_date": {
            "image": "test.png",
            "created_date": 1234,
            "original_tax": 2
        },
        "addJSON_without_created_date": {
            "image": "test.png",
            "original_tax": 2
        },
        "addJSON_parent_without_child_products": {
            "image": "test.png",
            "original_tax": 2,
            "created_date": 123,
            "attribute_type": 1
        },
        "addJSON_parent_with_child_products": {
            "image": "test.png",
            "original_tax": 2,
            "created_date": 123,
            "attribute_type": 1,
            "child_products": [
                {
                    "product": {
                        "image": "test1.png",
                        "original_tax": 2,
                        "created_date": 123,
                        "attribute_type": 2,
                        "sort": 1,
                        "name": "Child 1"
                    }
                },
                {
                    "product": {
                        "image": "test2.png",
                        "original_tax": 4,
                        "created_date": 344,
                        "attribute_type": 2,
                        "sort": 2,
                        "name": "Child 2"
                    }
                }
            ]
        },
        "get_product_attributes": {
            "attribute_1_selected": 1,
            "attribute_1_enable": true,
            "attribute_2_selected": 2,
            "attribute_2_enable": true
        },
        "get_attribute_1_data": {
            "attribute_1_selected": 1,
            "attribute_1_enable": true,
            "attribute_1_name": 'Test 1',
        },
        "get_attribute_2_data": {
            "attribute_2_selected": 2,
            "attribute_2_enable": true,
            "attribute_2_name": 'Test 2',
        }
    };
});