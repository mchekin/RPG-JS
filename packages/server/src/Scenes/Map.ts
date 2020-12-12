
import { RpgCommonMap } from '@rpgjs/common'
import { World } from '@rpgjs/sync-server'

export class SceneMap {

    static readonly id: string = 'map'

    private mapsById: object = {}
    
    constructor(private maps: any[], private server: any) {
        this.mapsById = {}
        if (this.maps) {
            for (let map of this.maps) {
                this.mapsById[map.id] = map
            }
        }
    }

    getMapBydId(id) {
        const mapClass = this.mapsById[id]
        if (!mapClass) {
            console.log(`Map ${id} not exists`)
            return false
        }
        return mapClass
    }

    async loadMap(id: string) {
        const mapClass = this.getMapBydId(id)
        let mapInstance
        
        if (mapClass.buffer.has(id)) {
            return mapClass.buffer.get(id)
        }

        if (RpgCommonMap.buffer.has(id)) {
            mapInstance =  RpgCommonMap.buffer.get(id)
        }
        else {
            mapInstance = World.addRoom(id, new mapClass(this.server))
            await mapInstance.load()
        }
       
        return mapInstance
    }

    async changeMap(mapId, player, positions?) {

        player.prevMap = player.map
        player.map = mapId
        player.paramsChanged.add('map') 
        player.events = []

        const mapInstance = await this.loadMap(mapId)

        if (mapInstance.onEnter) mapInstance.onEnter(player, player.prevMap || null)

        let { data: serializeMap } = Object.assign({}, RpgCommonMap.buffer.get(mapId))
        delete serializeMap.shapes 
        delete serializeMap.events
        delete serializeMap._events

        for (let layer of serializeMap.layers) {
            delete layer.map
        }

        this.server.sendToPlayer(player, 'player.loadScene', {
            name: 'map', 
            data: {
                id: mapId,
                ...serializeMap
            }
        })

        this.server.createRoom(mapId)
        this.server.assignObjectToRoom(player, mapId)
        World.joinRoom(mapId, player.id)
        
        if (!positions) positions = mapInstance.getPositionByShape(shape => shape.type == 'start')
        if (!positions) positions = { x: 0, y: 0 }

        player.setPosition(positions)
        
        /*player.events = mapInstance.createEvents('nosync', player)

        this.server.sendToPlayer(player, 'events', player.events.map(event => {
            return {
                x: event.x, 
                y: event.y,
                direction: event.direction,
                id: event.id,
                width: event.width,
                height: event.height
            }
        }))

        player.events.forEach(ev => {
            ev.execMethod('onInit', [player])
        })*/
    }
   
}