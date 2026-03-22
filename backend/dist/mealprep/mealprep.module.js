"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MealPrepModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const mealprep_entity_1 = require("./mealprep.entity");
const mealprep_service_1 = require("./mealprep.service");
const mealprep_controller_1 = require("./mealprep.controller");
let MealPrepModule = class MealPrepModule {
};
exports.MealPrepModule = MealPrepModule;
exports.MealPrepModule = MealPrepModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([mealprep_entity_1.MealPrepSettings])],
        controllers: [mealprep_controller_1.MealPrepController],
        providers: [mealprep_service_1.MealPrepService],
        exports: [mealprep_service_1.MealPrepService],
    })
], MealPrepModule);
//# sourceMappingURL=mealprep.module.js.map