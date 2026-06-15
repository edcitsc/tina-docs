---
title: Locate a Premise
category: Search Procedures
utilities:
  - MERC
  - MGU
  - NSG
  - PGL
  - WPS
  - WE
audience:
  - Account Management
  - Business Solutions Center
  - Complex - Residential Billing
  - Contact Center
  - Credit - Collections
  - Field Ops
  - Payment Processing
summary: Locate a premise or service address in Open-cIS by searching with a premise ID, address details, or premise attributes to find the appropriate service location.
last_reviewed: 11/11/2020 4:00 PM
document_id: OLEV2-128226294-7548
---

# Locate a Premise

## Applies To

- Utilities: MERC, MGU, NSG, PGL, WPS, WE
- Audience: Account Management, Business Solutions Center, Complex - Residential Billing, Contact Center, Credit - Collections, Field Ops, Payment Processing

## Description

A premise or service address is where a meter or service is located. A premise is located using various search criteria:

- Premise identification number: Locates one exact premise.
- Premise address: Locates one or more premises based on specific address information entered.
- Premise attribute: Locates all premises with a specified attribute value.

## Process

### CIS System Steps - Only

1. On the Home tab, select Premise.
   The Premise Search window displays.
2. Select the appropriate Search Criteria method.

    > Note: Search by using one or more of steps 3 to 5.

3. Do the following to locate a premise by premise identification number (ID), if known:

    - Enter premise identification number in the Premise ID field.
    - Select Search.

    The Premise Details window displays.

    > Note: No other information is necessary, and one exact premise is located when the premise identification number is entered.

    If more than one row displays, select one and then select Details. This is a known issue; there are not multiple records in the database.

4. Do one or more of the following to locate a premise by address:

    > Note: If the complete address is not known, use the wildcard (*).

    - Select the appropriate premise type from the Premise Type drop-down list, if necessary.

        > Note: Do not search by premise type if the complete street address is known.

    - Select the appropriate region from the Region drop-down list, if necessary.

        > Note: Do not search by region if the city is known.

    - Enter house number in the House # field.

        > Note: Enter an address with 1/2 as part of the house number with a space between the main number and 1/2, or use a wildcard.

        > Example: 1059 1/2 or 1059*

    - Select the appropriate street prefix from the Street Prefix drop-down list.
    - Enter street name in the Street Name field.
    - Select the appropriate street type from the Street Type drop-down list.
    - Select the appropriate street suffix from the Street Suffix drop-down list.
    - Enter city name in the City field.

        > Note: One of three required fields, City, State, or Zip Code, must be entered to search for a premise by address or attributes.

    - Select the appropriate state from the State drop-down list.
    - Enter zip code in the Zip Code field.
    - Select the appropriate county name from the County drop-down list.
    - Select the appropriate address type from the Address Type drop-down list.
    - Select the appropriate apartment type from the Apartment Type drop-down list.
    - Enter the appropriate apartment number in the Apartment # field.

5. Do the following to locate premise(s) by premise attribute information:

    - Select Attribute Expand/Collapse arrow.
    - Select Add + in the Attribute group box.
    - The Attribute Search Criteria fields display.
    - Select the appropriate entity from the Entity Type drop-down list.
    - Select the appropriate sub type from the Sub Type drop-down list.

        > Note: The sub types available in the drop-down list are based on the entity type selected.

    - Select the appropriate attribute from the Attribute drop-down list.

        > Note: The attributes available in the drop-down list are based on the entity type selected.

    - Select the appropriate operator from the Operator drop-down list.
    - Select or enter the appropriate value for the Search Value drop-down list.

        > Note: The search values available in the drop-down list are based on the attribute selected.

    - Repeat steps for each applicable attribute.

6. Select Search.
   A list of premises matching the search criteria entered displays in the Results group box.

    > Note: PGL and NSG only. Two identical addresses may be returned. One is the service address and the other is the service pipe premise.

## Metadata

- Last Reviewed: 11/11/2020 4:00 PM
- Document ID: OLEV2-128226294-7548
